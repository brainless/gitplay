import { Component, createEffect, createMemo, createSignal } from "solid-js";

import Button from "./Button";
import { useRepository } from "../stores/repository";

import PlayIcon from "../assets/fontawesome-free-6.4.0-desktop/svgs/solid/play.svg";
import PauseIcon from "../assets/fontawesome-free-6.4.0-desktop/svgs/solid/pause.svg";
import ForwardStepIcon from "../assets/fontawesome-free-6.4.0-desktop/svgs/solid/forward-step.svg";
import BackwardStepIcon from "../assets/fontawesome-free-6.4.0-desktop/svgs/solid/backward-step.svg";
import { usePlayer } from "../stores/player";

const PlayPause: Component = () => {
  const [store, { playTillPaused, pause }] = usePlayer();

  const handlePlayPause = () => {
    if (store.isPlaying) {
      pause();
    } else {
      playTillPaused();
    }
  };

  return (
    <Button
      svgIcon={store.isPlaying ? PauseIcon : PlayIcon}
      iconAlt={store.isPlaying ? "Pause" : "Play"}
      hasBorder={false}
      hasTransparentBG
      onClick={handlePlayPause}
    />
  );
};

const Forward: Component = () => {
  return (
    <Button
      svgIcon={ForwardStepIcon}
      iconAlt="Forward"
      hasBorder={false}
      hasTransparentBG
      // onClick={handlePlayPause}
    />
  );
};

const Backward: Component = () => {
  return (
    <Button
      svgIcon={BackwardStepIcon}
      iconAlt="Forward"
      hasBorder={false}
      hasTransparentBG
      // onClick={handlePlayPause}
    />
  );
};

const Timeline: Component = () => {
  const [focusPosition, setFocusPosition] = createSignal<number | null>(null);
  const [store, { loadNextCommits }] = useRepository();
  const [player] = usePlayer();

  const handleTimelineEnter = (event: MouseEvent) => {
    setFocusPosition(event.clientX);
  };

  const handleTimelineLeave = () => {
    setFocusPosition(null);
  };

  const getViewedWidth = createMemo(
    () => `${(store.currentCommitIndex / store.commitsCount) * 100}%`
  );
  const getRemainingWidth = createMemo(
    () =>
      `${
        ((store.commitsCount - store.currentCommitIndex - 1) /
          store.commitsCount) *
        100
      }%`
  );

  createEffect(() => {
    if (store.loadedCommitsCount - store.currentCommitIndex === 25) {
      // We are approaching the end of the number of loaded commits, lets fetch new ones
      loadNextCommits();
    }
  });

  const getCommit = createMemo(() => {
    if (focusPosition() === null) {
      return <></>;
    }
    const commitIndex = Math.floor(
      store.commitsCount * (focusPosition() / player.explorerDimensions[0])
    );
    const commit = store.commits[commitIndex];

    console.log(
      store.commitsCount,
      focusPosition() / player.explorerDimensions[0],
      Math.floor(
        store.commitsCount * (focusPosition() / player.explorerDimensions[0])
      )
    );

    return (
      <div class="text-gray-700">
        <div class="text-sm">{store.loadedCommitsCount}</div>
        <div class="text-gray-500 text-sm">{commitIndex}</div>
      </div>
    );
  });

  return (
    <div
      class="fixed bottom-0 bg-gray-100 w-full pt-4 pb-2"
      style={{ "z-index": 200 }}
    >
      <div
        class="relative w-full bg-gray-100 h-3 py-1 px-4 cursor-pointer"
        onMouseEnter={handleTimelineEnter}
        onMouseLeave={handleTimelineLeave}
        onMouseMove={handleTimelineEnter}
      >
        <div class="relative w-full flex flex-row">
          <div
            style={{
              "border-top": "3px solid rgb(190 18 60)",
              width: getViewedWidth(),
            }}
          ></div>
          <div
            style={{
              "border-top": "3px solid rgb(148 163 184)",
              width: getRemainingWidth(),
            }}
          ></div>
          {focusPosition() !== null && (
            <div
              class="absolute -top-1 w-3 h-3 bg-rose-700 rounded-full"
              style={{ left: getViewedWidth() }}
            ></div>
          )}
        </div>
      </div>

      <div class="flex flex-row">
        <PlayPause />
        <Forward />
        <Backward />
        <div class="font-bold text-gray-500 mr-2">Commit</div>

        {getCommit()}
      </div>
    </div>
  );
};

export default Timeline;
