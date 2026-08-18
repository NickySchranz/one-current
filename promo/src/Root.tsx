import React from "react";
import { Composition, Still } from "remotion";
import { loadFont } from "@remotion/google-fonts/Ubuntu";
import { PromoVideo, promoDuration } from "./PromoVideo";
import { videos } from "./videos";
import { PosterComp } from "./PosterComp";
import { Flagship } from "./Flagship";
import { posters } from "./posters";

loadFont();

export const Root: React.FC = () => (
  <>
    <Composition
      id="00-flagship"
      component={Flagship}
      durationInFrames={1800}
      fps={30}
      width={1080}
      height={1920}
    />
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
    {posters.map((def) => (
      <Still key={def.id} id={def.id} component={PosterComp} width={def.w} height={def.h} defaultProps={{ def }} />
    ))}
  </>
);
