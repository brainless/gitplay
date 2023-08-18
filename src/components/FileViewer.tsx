import { Component, createEffect, onCleanup } from "solid-js";
import { IPosition } from "../types";
import { useViewers } from "../stores/viewers";

interface IFileViewerPropTypes {
  objectId: string;
}

const FileViewer: Component<IFileViewerPropTypes> = ({ objectId }) => {
  const [viewers, { readFileContents, removeFile, setFileTreeToFocus }] =
    useViewers();
  let isPointerDown: boolean = false;
  let posOffset: IPosition = { x: 0, y: 0 };
  let containerRef: HTMLDivElement;
  let draggableRef: HTMLDivElement;

  createEffect(() => {
    readFileContents(objectId);
  });

  onCleanup(() => {
    removeFile(objectId);
  });

  const handlePointerDown = (event: PointerEvent) => {
    posOffset = {
      x: containerRef.offsetLeft - event.clientX,
      y: containerRef.offsetTop - event.clientY,
    };
    isPointerDown = true;
    draggableRef.setPointerCapture(event.pointerId);
    draggableRef.classList.remove("cursor-grab");
    draggableRef.classList.add("cursor-grabbing");
    setFileTreeToFocus(index());
  };

  const handlePointerUp = () => {
    isPointerDown = false;
    draggableRef.classList.remove("cursor-grabbing");
    draggableRef.classList.add("cursor-grab");
  };

  const handleMouseMove = (event: PointerEvent) => {
    if (isPointerDown) {
      let left = 0;
      let top = 0;
      if (event.clientX + posOffset.x > 0) {
        left = event.clientX + posOffset.x;
      }
      if (
        event.clientX + posOffset.x >
        store.explorerDimensions[0] - containerRef.clientWidth
      ) {
        left = store.explorerDimensions[0] - containerRef.clientWidth;
      }
      if (event.clientY + posOffset.y > 0) {
        top = event.clientY + posOffset.y;
      }
      if (
        event.clientY + posOffset.y >
        store.explorerDimensions[1] - containerRef.clientHeight
      ) {
        top = store.explorerDimensions[1] - containerRef.clientHeight;
      }

      containerRef.style.left = `${left}px`;
      containerRef.style.top = `${top}px`;
    }
  };

  return (
    <div
      class="bg-white absolute p-2 border-gray-100 border rounded-md"
      ref={containerRef}
      style={{
        "z-index": store.indexOfFileTreeInFocus === index() ? 100 : index(),
      }}
    >
      <div
        class="pt-1 pb-2 text-sm text-gray-600 cursor-grab"
        ref={draggableRef}
        onPointerDown={handlePointerDown}
        onMouseUp={handlePointerUp}
        onPointerMove={handleMouseMove}
      >
        {displayCurrentPath()}
      </div>
      <pre>{viewers.filesByObjectId[objectId].contents}</pre>
    </div>
  );
};

export default FileViewer;
