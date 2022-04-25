import * as ReactDOM from "react-dom";
import * as React from "react";
import "main.scss";
import { useEffect, useMemo, useState } from "react";
import { LoginButton, SessionProvider, useFile, useSession } from "@inrupt/solid-ui-react";
import * as rdflib from "rdflib";
import { PromiseContainer } from "./utils";

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
  const file = useFile(props.fileUri);

  const [currentContent, setCurrentContent] = useState<string>();

  // fetch the file content as text (too bad if it's binary)
  useEffect(() => {
    if (file.data) {
      file.data.text().then(setCurrentContent);
    } else {
      setCurrentContent(undefined);
    }
  }, [file]);

  // try to parse the content as rdf
  const graph = useMemo(() => {
    const contentType = file.data?.type;
    try {
      // if we have a mime type supported by rdflib, try to parse it
      if (currentContent && contentType && ["text/turtle", "application/n-triples", "text/n3", "application/n-quads", "application/rdf+xml"].includes(contentType))
        return parseRdf(currentContent, props.fileUri, contentType);
      else
        return undefined;
    } catch (e) {
      return undefined;
    }
  }, [currentContent, file.data?.type]);

  // check if there are any schema.org/Action entities in this graph (if it is a graph at all)
  const hasActions = useMemo(() => {
    return !!graph?.statementsMatching(null, rdflib.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"), rdflib.namedNode("https://schema.org/Action")).length;
  }, [graph]);

  return <div>
    {
      graph && hasActions ?
        <EditActions graph={graph} /> :
        <pre>
          {currentContent}
        </pre>
    }

  </div>;
};


export const EditActions = (props: { graph: rdflib.Store }) => {

  const actions = useMemo(() => {
    return props.graph?.statementsMatching(null, rdflib.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"), rdflib.namedNode("https://schema.org/Action")).map(st => st.subject);
  }, [props.graph]);

  return <table>
    {actions ? actions.map(a => <EditAction key={a.value} graph={props.graph} actionUri={a.value}/>) : null}
  </table>;
};

export const EditAction = (props: { graph: rdflib.Store, actionUri: string }) => {

  const actionProperties = useMemo(() => {
    return {
      type: props.graph?.anyValue(rdflib.namedNode(props.actionUri), rdflib.namedNode("https://schema.org/additionalType")) || null,
      object: props.graph?.anyValue(rdflib.namedNode(props.actionUri), rdflib.namedNode("https://schema.org/object")) || null,
      time: props.graph?.anyValue(rdflib.namedNode(props.actionUri), rdflib.namedNode("https://schema.org/startTime")) || null
    }
  }, [props.graph, props.actionUri]);

  return <tr>
    <td>{actionProperties.type}</td>
    <td>{actionProperties.time}</td>
    <td>{actionProperties.object}</td>
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
      <a onClick={() => setCurrentUri(new URL(isFolder ? ".." : ".", currentUri).toString())}>[..]</a> {isFolder ? "📁" : "📄"} {currentUri}
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

ReactDOM.render(<App />, document.getElementById("index"));
