import { Component } from "solid-js";
import { open } from "@tauri-apps/api/dialog";

import { useRepository } from "../stores/repository";
import Button from "./Button";

const Home: Component = () => {
  const [_, { setRepositoryPath, openRepository }] = useRepository();

  const handleOpenRequest = async () => {
    let selectedPath = await open({
      title: "Please select a Git repository",
      multiple: false,
      directory: true,
    });
    if (selectedPath) {
      if (typeof selectedPath === "object") {
        selectedPath = selectedPath[0] as string;
      }
      setRepositoryPath(selectedPath);
      openRepository();
    }
  };

  return (
    <div class="flex flex-col w-screen h-screen place-content-center place-items-center gap-10">
      <h1 class="text-6xl font-bold">
        git<span class="italic">Play</span>!
      </h1>
      <Button label="Open a respository" onClick={handleOpenRequest}></Button>
    </div>
  );
};

export default Home;
