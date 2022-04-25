import * as ReactDOM from "react-dom";
import * as React from "react";
import "main.scss";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LoginButton, SessionProvider, useFile, useSession } from "@inrupt/solid-ui-react";
import * as rdflib from "rdflib";
import { PromiseContainer } from "./utils";
import * as monaco from "monaco-editor";

import {
  getSolidDataset,
  getContainedResourceUrlAll,
  isContainer
} from "@inrupt/solid-client";


function parseRdf(str: string, baseUrl: string, contentType: string) {
  const store = rdflib.graph();
  try {
    str && rdflib.parse(str, store, baseUrl, contentType);
  } catch (err) {
    console.warn(`Failed to parse as ${contentType} :`);
    console.warn(err);
  }

  return store;
}

export const EditFile = (props: { fileUri: string }) => {
  const { session } = useSession();

  const file = useFile(props.fileUri);

  const [currentContent, setCurrentContent] = useState<{ content: string, type: string }>();
  const [isDirty, setDirty] = useState<boolean>(false);

  // fetch the file content as text (too bad if it's binary)
  useEffect(() => {
    if (file.data) {
      file.data.text().then((content) => setCurrentContent({
        content,
        type: file.data?.type || "text/plain"
      }));
    } else {
      setCurrentContent(undefined);
    }
  }, [file.data]);

  const modifyContent = useCallback((content?: string, type?: string) => {
    setCurrentContent((prevContent) => ({
      content: content == undefined ? (prevContent?.content || "") : content,
      type: type == undefined ? (prevContent?.type || "text/plain") : type
    }));

    setDirty(true);
  }, []);

  const saveFile = useCallback((content: { content: string, type: string }) => {
    session.fetch(props.fileUri, {
      method: "PUT",
      body: content.content,
      headers: {
        "Content-Type": content.type
      }
    });
  }, [session, props.fileUri]);

  const saveGraph = useCallback((graph: rdflib.Store) => {
    const turtleStr = graph.serialize(props.fileUri, "application/n-triples", null);
    modifyContent(turtleStr);
  }, [props.fileUri, modifyContent]);

  // try to parse the content as rdf
  const graph = useMemo(() => {
    try {
      // if we have a mime type supported by rdflib, try to parse it
      if (currentContent?.type && ["text/turtle", "application/n-triples", "text/n3", "application/n-quads", "application/rdf+xml"].includes(currentContent?.type))
        return parseRdf(currentContent.content, props.fileUri, currentContent?.type);
      else
        return undefined;
    } catch (e) {
      return undefined;
    }
  }, [currentContent]);

  // check if there are any schema.org/Action entities in this graph (if it is a graph at all)
  const hasActions = useMemo(() => {
    return !!graph?.statementsMatching(null, rdflib.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"), rdflib.namedNode("https://schema.org/Action")).length;
  }, [graph]);

  const [displayActionsEditor, setDisplayActionsEditor] = useState<boolean>(hasActions);

  return <div>
    <select value={currentContent?.type} onChange={(e) => modifyContent(undefined, e.currentTarget.value)}>
      <option>text/plain</option>
      <option>application/json</option>
      <option>text/turtle</option>
    </select>
    {isDirty ? <button onClick={() => currentContent && saveFile(currentContent)}>Save</button> : null}
    {hasActions ? <button onClick={() => setDisplayActionsEditor(!displayActionsEditor)}>Toggle Editor</button> : null}
    {
      graph && displayActionsEditor ?
        <EditActions graph={graph} onChange={saveGraph} /> :
        currentContent ? <MonacoEditor text={currentContent.content} onChange={modifyContent}
                                       contentType={currentContent.type} /> : null
    }
  </div>;
};


export const EditActions = (props: { graph: rdflib.Store, onChange: (graph: rdflib.Store) => void }) => {

  const actions = useMemo(() => {
    return props.graph?.statementsMatching(null, rdflib.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"), rdflib.namedNode("https://schema.org/Action")).map(st => st.subject);
  }, [props.graph]);

  return <table>
    <tbody>
    <tr>
      <th>Type</th>
      <th>Time</th>
      <th>Track</th>
      <th>Album</th>
      <th>Artist</th>
    </tr>
    {actions ? actions.map(a => <EditAction key={a.value} graph={props.graph} actionUri={a.value}
                                            onChange={props.onChange} />) : null}
    </tbody>
  </table>;
};

export const EditAction = (props: { graph: rdflib.Store, actionUri: string, onChange: (graph: rdflib.Store) => void }) => {

  const actionProperties = useMemo(() => {
    const objectUri = props.graph?.anyValue(rdflib.namedNode(props.actionUri), rdflib.namedNode("https://schema.org/object")) || undefined;
    const name = objectUri && props.graph?.anyValue(rdflib.namedNode(objectUri), rdflib.namedNode("https://schema.org/name")) || undefined;

    return {
      type: props.graph?.anyValue(rdflib.namedNode(props.actionUri), rdflib.namedNode("https://schema.org/additionalType")) || undefined,
      object: {
        name
      },
      time: props.graph?.anyValue(rdflib.namedNode(props.actionUri), rdflib.namedNode("https://schema.org/startTime")) || undefined
    };
  }, [props.graph, props.actionUri]);


  const setType = useCallback((type: string) => {
    props.graph?.removeMatches(rdflib.namedNode(props.actionUri), rdflib.namedNode("https://schema.org/additionalType"));
    props.graph?.add(rdflib.namedNode(props.actionUri), rdflib.namedNode("https://schema.org/additionalType"), rdflib.namedNode(type));

    props.onChange(props.graph);
  }, []);


  return <tr>
    <td>
      <select value={actionProperties.type} onChange={(e) => setType(e.currentTarget.value)}>
        <option>https://schema.org/BookmarkAction</option>
        <option>https://schema.org/LikeAction</option>
        <option>https://schema.org/FollowAction</option>
      </select>
    </td>
    <td>{actionProperties.time}</td>
    <td>{actionProperties.object.name}</td>
  </tr>;
};


/**
 * Display the content of a folder resource
 */
export const DisplayFolder = (props: { folderUri: string, onSelect?: (uri: string) => void }) => {
  const { session } = useSession();

  // fetch folder content - this will fail
  const childrenResourcesPromise = useMemo(async () => {
    const folder = await getSolidDataset(props.folderUri, { fetch: session.fetch });
    return getContainedResourceUrlAll(folder);
  }, [props.folderUri, session.fetch]);

  return <div>
    <PromiseContainer promise={childrenResourcesPromise}>
      {(childrenResources) => <>
        {childrenResources.map(child => (
          <div key={child}>
            {isContainer(child) ? "📁" : "📄"} <a
            onClick={() => props.onSelect && props.onSelect(child)}>{child.substring(props.folderUri.length)}</a>
          </div>
        ))}
      </>}
    </PromiseContainer>
  </div>;
};

/**
 * Display the content of a resource, either folder or file.
 * If no uri is provided, use the root folder of the current user's storage
 */
export const BrowseContent = (props: { uri?: string }) => {
  const { session } = useSession();

  const [currentUri, setCurrentUri] = useState<string>();

  useEffect(() => {
    if (props.uri) {
      // folder URI is provided, use it as is
      setCurrentUri(props.uri);
    } else if (session.info.webId) {
      // take the root of the current user storage as folder

      // fetch the user profile
      session.fetch(session.info.webId).then(resp => resp.text()).then(
        profileTxt => {
          // parse the RDF graph and get the 'http://www.w3.org/ns/pim/space#storage' value
          const graph = session.info.webId ? parseRdf(profileTxt, session.info.webId, "text/turtle") : undefined;
          const uri = graph?.anyStatementMatching(null, rdflib.namedNode("http://www.w3.org/ns/pim/space#storage"))?.object.value;

          setCurrentUri(uri);
        }
      );
    } else {
      // no folder provided and no user authenticated
      setCurrentUri(undefined);
    }

  }, [props.uri, session.info.webId]);

  const isFolder = useMemo(() => !!currentUri && isContainer(currentUri), [currentUri]);

  return <div>
    <h3>
      <a
        onClick={() => setCurrentUri(new URL(isFolder ? ".." : ".", currentUri).toString())}>[..]</a> {isFolder ? "📁" : "📄"} {currentUri}
    </h3>
    {isFolder ?
      <DisplayFolder folderUri={currentUri!} onSelect={setCurrentUri} /> :
      <EditFile fileUri={currentUri!} />}
  </div>;
};


export const MainPage = () => {
  const { session } = useSession();
  return <div>
    <h2>Solid browser for media actions</h2>
    {session.info.isLoggedIn ? <BrowseContent /> : <LoginButton
      oidcIssuer="https://inrupt.net"
      redirectUrl="https://localhost:8000/"
    />}
  </div>;
};


export const App = () => {
  return (
    <SessionProvider>
      <MainPage />
    </SessionProvider>
  );
};


export const MONACO_TYPE_MAP = {
  "text/turtle": "turtle",
  "application/json": "json",
  default: undefined
};

export const MonacoEditor = (props: { text: string, contentType?: string, onChange?: (newText: string) => void }) => {
  const divEl = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor>();

  useEffect(() => {
    if (divEl.current) {

      editor?.dispose();
      const newEditor = monaco.editor.create(divEl.current, {
        theme: "turtleTheme",
        value: props.text,
        language: MONACO_TYPE_MAP[props.contentType || "default"]
      });
      newEditor.onDidChangeModelContent((e) => {
        props.onChange && props.onChange(newEditor.getValue());
        //(editor.getModel() as any).rdfGraph = parseRdf(editor.getValue());
      });
      //(editor.getModel() as any).rdfGraph = parseRdf(props.text);

      newEditor.focus();

      setEditor(newEditor);

      return () => {
        newEditor.dispose();
      };
    } else {
      return;
    }
  }, [divEl.current, props.onChange]);

  useEffect(() => {
    editor?.setValue(props.text);
  }, [props.text, editor]);


  return <div className="Editor" ref={divEl}
              style={{ width: "800px", height: "600px", border: "1px solid #ccc" }}></div>;
};

ReactDOM.render(<App />, document.getElementById("index"));
