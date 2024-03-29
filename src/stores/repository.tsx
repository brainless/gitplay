import type { JSX } from "solid-js";
import { Component, createContext, useContext } from "solid-js";
import { createStore } from "solid-js/store";
import { invoke } from "@tauri-apps/api";

import {
  APIPrepareCacheResponse,
  APIGetCommitsResponse,
  ICommitFrame,
  IFileTree,
  isIAPICommitFrame,
} from "../types";
import { useChangesStore } from "./changes";

/**
 * Main data structure for the UI application.
 *
 * We track the current repository (path in local filesystem), current branch, current commit,
 * play status, path inside the git file tree, list of commits (loaded with pagination),
 * list of files (loaded per commit visit)
 *
 * The data structure is read using `store` variable and then the needed key,
 * like `store.currentBranch`
 *
 * There are setters or modifiers to update the data structure (defined in `makeRepository`)
 */
interface IStore {
  isReady: boolean; // Repository is open, first batch of commits, count of commits and first commit details are fetched
  repositoryPath?: string;

  currentBranch?: string;
  currentCommitIndex: number;
  currentFileTree?: IFileTree;

  listOfCommitHashInOrder: Array<string>;
  commits: {
    [key: string]: string;
  };
  commitsCount: number; // Total count of commits in this repository, sent when repository is first opened
  batchSize: number; // How many commits are fetched in one "batch" (API request)
  fetchedBatchIndices: Array<number>; // Which batches (commits requested together) have been fetched
  isFetchingCommits: boolean;

  lastErrorMessage?: string;
}

interface ICommitDetails extends ICommitFrame {
  fileTree?: IFileTree;
}

/**
 * Function to fetch the details for a single commit, generally the file list.
 * The file list is flat, unlike a tree in Rust code. Each item has its relative path.
 *
 * @param commitId string commit hash
 * @returns Promise of commit's detail with the file list
 */
const getCommitDetails = (
  commitId: string,
  requestedFolders: Array<string>
): Promise<ICommitDetails> =>
  new Promise((resolve, reject) => {
    invoke("get_commit_details", {
      commitId,
      requestedFolders,
    })
      .then((response) => {
        if (isIAPICommitFrame(response)) {
          const fileTree = !!response.file_structure
            ? {
                objectId: response.file_structure.object_id,
                blobs: response.file_structure.blobs.map((x) => ({
                  objectId: x.object_id,
                  path: x.path,
                  name: x.name,
                  isDirectory: x.is_directory,
                  size: x.size,
                })),
              }
            : undefined;

          resolve({
            commitId: response.commit_id,
            commitMessage: response.commit_message,
            fileTree,
          });
        }
      })
      .catch((error) => {
        reject(error);
      });
  });

const getDefaultStore = () => {
  const constDefaultStore: IStore = {
    isReady: false,
    currentCommitIndex: 0,
    listOfCommitHashInOrder: [],
    commits: {},
    commitsCount: 0,
    fetchedBatchIndices: [],
    batchSize: 100,
    isFetchingCommits: false,
  };
  return constDefaultStore;
};

/**
 * Function to create the actual SolidJS store with the IStore data structure and
 * the setters to modifiers to the data.
 *
 * @param defaultStore IStore default values
 * @returns readly IStore data and the setters/modifiers
 */
const makeRepository = (defaultStore = getDefaultStore()) => {
  const [store, setStore] = createStore<IStore>(defaultStore);

  return [
    store,
    {
      setRepositoryPath(path: string) {
        setStore("repositoryPath", path);
      },

      openRepository() {
        if (!store.repositoryPath) {
          return;
        }
        setStore(() => ({
          ...getDefaultStore(),
          isPathInvalid: false,
          isFetchingCommits: true,
          isPlaying: false,
        }));

        invoke("open_repository", { path: store.repositoryPath })
          .then(() => invoke("prepare_cache"))
          .then((response) => {
            const data = response as APIPrepareCacheResponse;
            setStore((state) => ({
              ...state,
              commitsCount: data[0],
              listOfCommitHashInOrder: data[1],
            }));
            return invoke("get_commits", {
              startIndex: 0,
              count: store.batchSize,
            });
          })
          .then((response) => {
            const data = response as APIGetCommitsResponse;
            const [changes] = useChangesStore();
            setStore((state) => ({
              ...state,
              commits: data,
              currentPathInFileTree: [],
              fetchedBatchIndices: [0],
              isFetchingCommits: false,
              isReady: true,
              currentCommitIndex: 0,
            }));

            return getCommitDetails(
              store.listOfCommitHashInOrder[0],
              changes.openFolders
            );
          })
          .then((response) => {
            const [
              _,
              {
                fetchSizeChangesForOpenFolders,
                fetchFilesOrderedByMostModifications,
              },
            ] = useChangesStore();
            setStore((state) => ({
              ...state,
              currentFileTree: response.fileTree,
              isReady: true,
              isFetchingCommits: false,
            }));

            fetchSizeChangesForOpenFolders(0);
            fetchFilesOrderedByMostModifications(0);
          })
          .catch((error) => {
            setStore("lastErrorMessage", error as string);
          });
      },

      loadCommits(fromCommitIndex: number) {
        // This function is called when playing the log and we have to fetch the next batch commits
        if (
          !store.isReady ||
          store.isFetchingCommits ||
          fromCommitIndex >= store.commitsCount
        ) {
          return;
        }
        setStore("isFetchingCommits", true);

        const batchIndex = Math.floor(fromCommitIndex / store.batchSize);
        if (store.fetchedBatchIndices.includes(batchIndex)) {
          return;
        }

        invoke("get_commits", {
          startIndex:
            Math.floor(fromCommitIndex / store.batchSize) * store.batchSize, // Take the start of a batch
          count: store.batchSize,
        }).then((response) => {
          const data = response as APIGetCommitsResponse;

          setStore("commits", (state) => ({
            ...state,
            ...data,
          }));
          setStore("fetchedBatchIndices", (state) => [
            ...state,
            Math.floor(fromCommitIndex / store.batchSize),
          ]);
          setStore("isFetchingCommits", false);
        });
      },

      setCurrentCommitIndex(commitIndex: number) {
        const [
          changes,
          {
            fetchSizeChangesForOpenFolders,
            fetchFilesOrderedByMostModifications,
          },
        ] = useChangesStore();
        if (!store.isReady) {
          return;
        }

        setStore((state) => ({
          ...state,
          currentCommitIndex: commitIndex,
          currentFileTree: undefined,
          isPlaying: false,
        }));

        getCommitDetails(
          store.listOfCommitHashInOrder[commitIndex],
          changes.openFolders
        ).then((response) => {
          setStore("currentFileTree", response.fileTree);

          fetchSizeChangesForOpenFolders(commitIndex);
          fetchFilesOrderedByMostModifications(commitIndex);
        });
      },

      incrementCurrentCommitIndex() {
        setStore("currentCommitIndex", (value) => value + 1);
      },

      fetchCommitDetails() {
        const [changes] = useChangesStore();
        getCommitDetails(
          store.listOfCommitHashInOrder[store.currentCommitIndex],
          changes.openFolders
        ).then((response) => {
          setStore("currentFileTree", response.fileTree);
        });
      },
    },
  ] as const; // `as const` forces tuple type inference
};

export const repositoryInner = makeRepository();

interface IRepositoryProviderPropTypes {
  children: JSX.Element;
}

type TRepositoryContext = ReturnType<typeof makeRepository>;

export const RepositoryContext =
  createContext<TRepositoryContext>(repositoryInner);

export const RepositoryProvider: Component<IRepositoryProviderPropTypes> = (
  props: IRepositoryProviderPropTypes
) => (
  <RepositoryContext.Provider value={repositoryInner}>
    {props.children}
  </RepositoryContext.Provider>
);

export const useRepository = () => useContext(RepositoryContext);
