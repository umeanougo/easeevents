import { Composition } from "remotion";
import { MainVideo, TOTAL } from "./MainVideo";

const FPS = 30;

export const RemotionRoot = () => (
  <>
    <Composition
      id="landscape"
      component={MainVideo}
      durationInFrames={TOTAL}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{ orientation: "landscape" as const }}
    />
    <Composition
      id="portrait"
      component={MainVideo}
      durationInFrames={TOTAL}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{ orientation: "portrait" as const }}
    />
  </>
);
