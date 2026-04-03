export interface RepoConfig {
  owner: string;
  repo: string;
  displayName: string;
  language: string;
  studioId: string;
  color: string;
  eaAnalogue: string;
}

export const CANONICAL_REPOS: RepoConfig[] = [
  {
    owner: "godotengine",
    repo: "godot",
    displayName: "Godot Engine",
    language: "C++",
    studioId: "godot",
    color: "#3b82f6",
    eaAnalogue: "Frostbite Engine",
  },
  {
    owner: "o3de",
    repo: "o3de",
    displayName: "Open 3D Engine",
    language: "C++",
    studioId: "o3de",
    color: "#8b5cf6",
    eaAnalogue: "DICE / Battlefield",
  },
  {
    owner: "space-wizards",
    repo: "space-station-14",
    displayName: "Space Station 14",
    language: "C#",
    studioId: "ss14",
    color: "#f59e0b",
    eaAnalogue: "Respawn Entertainment",
  },
  {
    owner: "CleverRaven",
    repo: "Cataclysm-DDA",
    displayName: "Cataclysm DDA",
    language: "C++",
    studioId: "cdda",
    color: "#ef4444",
    eaAnalogue: "EA Sports FC",
  },
  {
    owner: "monogame",
    repo: "monogame",
    displayName: "MonoGame",
    language: "C#",
    studioId: "monogame",
    color: "#10b981",
    eaAnalogue: "Maxis",
  },
  {
    owner: "OGRECave",
    repo: "ogre",
    displayName: "OGRE3D",
    language: "C++",
    studioId: "ogre",
    color: "#06b6d4",
    eaAnalogue: "EA Tiburon",
  },
];
