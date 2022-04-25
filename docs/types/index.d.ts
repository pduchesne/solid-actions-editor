import "main.scss";
import * as rdflib from "rdflib";
export declare const EditFile: (props: {
    fileUri: string;
}) => JSX.Element;
export declare const EditActions: (props: {
    graph: rdflib.Store;
    onChange: (graph: rdflib.Store) => void;
}) => JSX.Element;
export declare const EditAction: (props: {
    graph: rdflib.Store;
    actionUri: string;
    onChange: (graph: rdflib.Store) => void;
}) => JSX.Element;
/**
 * Display the content of a folder resource
 */
export declare const DisplayFolder: (props: {
    folderUri: string;
    onSelect?: ((uri: string) => void) | undefined;
}) => JSX.Element;
/**
 * Display the content of a resource, either folder or file.
 * If no uri is provided, use the root folder of the current user's storage
 */
export declare const BrowseContent: (props: {
    uri?: string;
}) => JSX.Element;
export declare const MainPage: () => JSX.Element;
export declare const App: () => JSX.Element;
export declare const MONACO_TYPE_MAP: {
    "text/turtle": string;
    "application/json": string;
    default: undefined;
};
export declare const MonacoEditor: (props: {
    text: string;
    contentType?: string | undefined;
    onChange?: ((newText: string) => void) | undefined;
}) => JSX.Element;
