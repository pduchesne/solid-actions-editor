import * as ReactDOM from "react-dom";
import * as React from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import "main.scss";
import { useMemo } from "react";
import { LoginButton, SessionProvider, useFile, useSession } from "@inrupt/solid-ui-react";
import * as rdflib from "rdflib";
import { PromiseContainer } from "./utils";


function parseRdf(str: string, baseUrl: string) {
  const store = rdflib.graph();
  try {
    str && rdflib.parse(str, store, baseUrl, "text/turtle");
  } catch (err) {
    console.warn("Failed to parse turtle: ");
    console.error(err);
  }

  return store;
}

export const EditFile = (props: {fileUri: string}) => {
  const file = useFile(props.fileUri);
  const graphPromise = useMemo(async () => {
    const data = await file.data?.text();
    const graph = data ? parseRdf(data, props.fileUri) : undefined;
    return graph
  }, [file.data])

  const actionsPromise = useMemo(async () => {
    return graphPromise.then(graph => {
      return graph?.statementsMatching(null, rdflib.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"), rdflib.namedNode("https://schema.org/Action")).map(st => st.subject)
    })
  }, [graphPromise])

  return <PromiseContainer promise={actionsPromise}>
    {(actions) => (
      <div>
        <div>Editing {props.fileUri}</div>
        {actions ? actions.map(a => <div>{a.value}</div>) : null}
      </div>
    )}
  </PromiseContainer> ;
}

export const BrowseContent = () => {
    const { session } = useSession();
    //const profile = useDataset(session.info.webId);

    //const storage = useThing(session.info.webId, "http://www.w3.org/ns/pim/space#storage");
    const profile = useFile(session.info.webId);
    const storageUriPromise = useMemo(async () => {
      const profileTxt = await profile.data?.text();
      const graph = profileTxt && session.info.webId ? parseRdf(profileTxt, session.info.webId) : undefined;
      return graph?.anyStatementMatching(null, rdflib.namedNode("http://www.w3.org/ns/pim/space#storage"))?.object.value
    }, [profile.data])
    //const files = useThing("");
  return <PromiseContainer promise={storageUriPromise}>
    {(storageUri) => (
      <div>
        <div>Browse Content at {storageUri}</div>
        {JSON.stringify(storageUri, undefined, 4)}

        <EditFile fileUri={storageUri+".datavillage/spotify/spotify-followed-artists.rdf"} />
      </div>
    )}
  </PromiseContainer> ;
};

export const WelcomePage = () => {
    const { session } = useSession();
    return <div>
        <div>Welcome</div>
        {session.info.isLoggedIn ? <BrowseContent /> : <LoginButton
            oidcIssuer="https://inrupt.net"
            redirectUrl="https://localhost:8000/"
            />}

    </div>;
};


export const Editor = () => {
  return <div>Editor</div>;
};

const routes = [
  {
    component: Editor,
    path: "/tools/basic-viewer"
  }
];

export const App = () => {
  return (
    <SessionProvider>
      <HashRouter>
        <div className="mainApp vFlow">
          <Routes>
            <Route

              path="/"
              //component={...}
              element={<WelcomePage />}
            />

            {routes.map((route, i) => (
              <Route path={route.path} key={i} element={<route.component />} />
            ))}
          </Routes>
        </div>
      </HashRouter>
    </SessionProvider>
  );
};

ReactDOM.render(<App />, document.getElementById("index"));
