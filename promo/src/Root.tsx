import React from "react";
import { Composition } from "remotion";
import { loadFont } from "@remotion/google-fonts/Ubuntu";
import { PromoVideo, promoDuration } from "./PromoVideo";
import { videos } from "./videos";

loadFont();

export const Root: React.FC = () => (
  <>
    {videos.map((def) => (
      <Composition
        key={def.id}
        id={def.id}
        component={PromoVideo}
        durationInFrames={promoDuration(def)}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ def }}
      />
    ))}
  </>
);
