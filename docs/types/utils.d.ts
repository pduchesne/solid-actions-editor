import * as React from "react";
export declare type PromiseState<R> = {
    done: false;
    result?: undefined;
    error?: undefined;
} | ({
    done: true;
} & ({
    success: true;
    result: R;
    error?: undefined;
} | {
    success: false;
    error: any;
    result?: undefined;
}));
export declare function usePromise<R>(promise: Promise<R> | undefined): PromiseState<R>;
export declare function shallowEqual(objA: any, objB: any): boolean;
export declare function useRefMemo<R>(createFn: () => R, deps: any[]): R;
export declare function usePromiseFn<P, R>(createFn: () => Promise<R> | undefined, deps: any[]): PromiseState<R>;
export declare function renderPromiseFn<R>(promiseFn: () => Promise<R> | undefined, deps: any[], children: (result: R) => React.ReactElement | null, errorFn?: (error: string) => React.ReactElement | null, loadingFn?: () => React.ReactElement | null): React.ReactElement | null;
export declare function renderPromise<R>(promise: Promise<R>, children: (result: R) => React.ReactElement | null, errorFn?: (error: string) => React.ReactElement | null, loadingFn?: () => React.ReactElement | null): React.ReactElement | null;
export declare function renderPromiseState<R>(state: PromiseState<R>, children: (result: R) => React.ReactElement | null, errorFn?: (error: string) => React.ReactElement | null, loadingFn?: () => React.ReactElement | null): React.ReactElement | null;
export declare function PromiseFnContainer<R>(props: {
    promiseFn: () => Promise<R> | undefined;
    deps: any[];
    children: (result: R) => React.ReactElement | null;
    errorFn?: (error: string) => React.ReactElement | null;
    loadingFn?: () => React.ReactElement | null;
}): React.ReactElement<any, string | React.JSXElementConstructor<any>> | null;
export declare function PromiseContainer<R>(props: {
    promise: Promise<R>;
    children: (result: R) => React.ReactElement | null;
    errorFn?: (error: string) => React.ReactElement | null;
    loadingFn?: () => React.ReactElement | null;
}): React.ReactElement<any, string | React.JSXElementConstructor<any>> | null;
