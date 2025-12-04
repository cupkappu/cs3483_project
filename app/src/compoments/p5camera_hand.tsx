import Sketch from "react-p5";
import p5Types from "p5";
import { useRef } from "react";

export default function P5camera_hand({
  gesture_callback,
  confidence_callback,
}: {
  gesture_callback: (gesture: string) => void;
  confidence_callback: (confidence: number) => void;
}) {
  const handPoseRef = useRef<any>(null);
  const videoRef = useRef<any>(null);
  const detectionsRef = useRef<any[]>([]);
  const lastDirectionRef = useRef<string>("");
  const frameCountRef = useRef(0);


  const setup = (p5: p5Types, canvasParentRef: Element) => {
    p5.createCanvas(625, 437).parent(canvasParentRef);
    videoRef.current = p5.createCapture("video");
    videoRef.current.size(625, 437);
    videoRef.current.hide();

    setTimeout(async () => {
      const ml5 = (window as any).ml5;
      if (ml5 && ml5.handPose) {
        let options = { maxHands: 1, flipped: false };
        handPoseRef.current = await ml5.handPose(options);
        handPoseRef.current.detectStart(
            videoRef.current, (results: any) => {
                detectionsRef.current = results;
            },
    );
      }
    }, 2000);
  };

  const draw = (p5: p5Types) => {
    if (!videoRef.current) return; // Wait for video to be initialized
    
    p5.image(videoRef.current, 0, 0, p5.width, p5.height);
    
    if (detectionsRef.current && detectionsRef.current.length > 0) {
      drawKeypoints(p5, detectionsRef.current);

      // Only update every 10 frames to reduce callback frequency
      frameCountRef.current++;
      if (frameCountRef.current % 10 === 0) {
        const angle = detectDirection(detectionsRef.current[0]);
        const confidence = detectionsRef.current[0].confidence;
        confidence_callback(confidence);
        if (angle && angle !== lastDirectionRef.current) {
          gesture_callback(`${angle}°`);
          lastDirectionRef.current = angle;
        }
      }
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
  

  const detectDirection = (detection: any) => {
    if (!detection || !detection.keypoints3D) return null;
    
    // Use wrist and middle finger tip to determine hand pointing direction
    const wrist = detection.keypoints3D[0]; // 手腕
    const middleFingerTip = detection.keypoints3D[12]; // 中指指尖
    
    // Calculate vector from wrist to middle finger tip
    const dx = middleFingerTip.x - wrist.x;
    const dy = middleFingerTip.y - wrist.y;
    const dz = middleFingerTip.z - wrist.z;
    
    // Calculate the length of the horizontal projection (x-z plane)
    const horizontalLength = Math.sqrt(dx * dx + dz * dz);
    
    // Calculate elevation angle (angle from horizontal plane)
    // Positive angle = pointing up, Negative angle = pointing down
    const elevationAngle = Math.atan2(-dy, horizontalLength) * (180 / Math.PI);
    
    return elevationAngle.toFixed(1);
  };
  // gesture_callback("test_gesture");

  return <Sketch setup={setup} draw={draw} />;
}
