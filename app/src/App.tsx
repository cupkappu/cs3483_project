// src/App.tsx
import Sketch from "react-p5";
import p5Types from "p5";

export default function App() {
  let handPose: any;
  let video: any;
  let detections: any[] = [];


  const setup = (p5: p5Types, canvasParentRef: Element) => {
    p5.createCanvas(625, 437).parent(canvasParentRef);
    video = p5.createCapture("video");
    video.size(625, 437);
    video.hide();

    setTimeout(async () => {
      const ml5 = (window as any).ml5;
      if (ml5 && ml5.handPose) {
        let options = { maxHands: 1, flipped: false };
        handPose = await ml5.handPose(options);
        handPose.detectStart(video, (results: any) => {
          detections = results;
        });
      }
    }, 2000);
  };

  const draw = (p5: p5Types) => {
    p5.image(video, 0, 0, p5.width, p5.height);
    
    if (detections && detections.length > 0) {
      drawKeypoints(p5, detections);
    };
  };

  const drawKeypoints = (p5: p5Types, detections: any[]) => {
    p5.noStroke();
    p5.fill(0, 255, 0);
    for (let i = 0; i < detections.length; i++) {
      let detection = detections[i];
      for (let j = 0; j < detection.keypoints.length; j++) {
        let keypoint = detection.keypoints[j];
        p5.circle(keypoint.x, keypoint.y, 5);
      }
    }
  };

  return <Sketch setup={setup} draw={draw} />;
}
