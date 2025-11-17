// src/App.tsx
import Sketch from "react-p5";
import p5Types from "p5";

export default function App() {
  let handPose: any;
  let video: any;
  let detections: any[] = [];
  let gestureHistory: { x: number; y: number; time: number; size: number; orientation: string }[] = [];
  let smoothedPositions: { x: number; y: number }[] = [];
  let detectedGesture = "";
  let gestureConfidence = 0;
  let lastGestureTime = 0;
  let currentPalmOrientation = "";
  const historyLength = 30;
  const confidenceThreshold = 0.3;
  const gestureDebounceTime = 500;
  const minVelocity = 2;

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

  const applyExponentialSmoothing = (currentPos: { x: number; y: number }, prevSmoothed: { x: number; y: number } | null, alpha: number = 0.3): { x: number; y: number } => {
    if (!prevSmoothed) return currentPos;
    return {
      x: alpha * currentPos.x + (1 - alpha) * prevSmoothed.x,
      y: alpha * currentPos.y + (1 - alpha) * prevSmoothed.y
    };
  };

  const calculateVelocity = (history: { x: number; y: number; time: number }[]): number => {
    if (history.length < 2) return 0;
    const recent = history.slice(-5);
    if (recent.length < 2) return 0;
    const start = recent[0];
    const end = recent[recent.length - 1];
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const timeDelta = end.time - start.time;
    return timeDelta > 0 ? (distance / timeDelta) * 1000 : 0;
  };

  const calculatePalmOrientation = (keypoints: any[]): string => {
    const thumbTip = keypoints[4];
    const indexTip = keypoints[8];
    const middleTip = keypoints[12];
    const indexBase = keypoints[5];
    const middleBase = keypoints[9];
    
    const palmCenterX = (indexBase.x + middleBase.x) / 2;
    const palmCenterY = (indexBase.y + middleBase.y) / 2;
    
    const fingerDirX = (indexTip.x + middleTip.x) / 2 - palmCenterX;
    const fingerDirY = (indexTip.y + middleTip.y) / 2 - palmCenterY;
    
    const thumbRelX = thumbTip.x - palmCenterX;
    const thumbRelY = thumbTip.y - palmCenterY;
    
    const angle = Math.atan2(fingerDirY, fingerDirX) * 180 / Math.PI;
    const crossProduct = fingerDirX * thumbRelY - fingerDirY * thumbRelX;
    
    if (Math.abs(angle) < 45) {
      return crossProduct > 0 ? "手心向下" : "手心向上";
    } else if (Math.abs(angle) > 135) {
      return crossProduct > 0 ? "手心向上" : "手心向下";
    } else if (angle > 45 && angle < 135) {
      return crossProduct > 0 ? "手心向右" : "手心向左";
    } else {
      return crossProduct > 0 ? "手心向左" : "手心向右";
    }
  };

  const calculateHandSize = (keypoints: any[]): number => {
    const thumbBase = keypoints[2];
    const pinkyBase = keypoints[17];
    const width = Math.sqrt(
      Math.pow(thumbBase.x - pinkyBase.x, 2) +
      Math.pow(thumbBase.y - pinkyBase.y, 2)
    );
    
    const wrist = keypoints[0];
    const middleTip = keypoints[12];
    const length = Math.sqrt(
      Math.pow(middleTip.x - wrist.x, 2) +
      Math.pow(middleTip.y - wrist.y, 2)
    );
    
    return width * length;
  };

  const draw = (p5: p5Types) => {
    p5.image(video, 0, 0, p5.width, p5.height);
    
    if (detections && detections.length > 0) {
      const detection = detections[0];
      
      if (detection.score && detection.score < confidenceThreshold) {
        return;
      }
      
      drawKeypoints(p5, detections);
      
      const wrist = detection.keypoints[0];
      currentPalmOrientation = calculatePalmOrientation(detection.keypoints);
      const handSize = calculateHandSize(detection.keypoints);
      
      const prevSmoothed = smoothedPositions.length > 0 ? smoothedPositions[smoothedPositions.length - 1] : null;
      const smoothedPos = applyExponentialSmoothing({ x: wrist.x, y: wrist.y }, prevSmoothed, 0.3);
      smoothedPositions.push(smoothedPos);
      
      if (smoothedPositions.length > historyLength) {
        smoothedPositions.shift();
      }
      
      gestureHistory.push({
        x: smoothedPos.x,
        y: smoothedPos.y,
        time: Date.now(),
        size: handSize,
        orientation: currentPalmOrientation
      });
      
      if (gestureHistory.length > historyLength) {
        gestureHistory.shift();
      }
      
      const velocity = calculateVelocity(gestureHistory);
      
      const currentTime = Date.now();
      if (gestureHistory.length >= historyLength && 
          velocity > minVelocity &&
          currentTime - lastGestureTime > gestureDebounceTime) {
        const newGesture = recognizeGestureWithOrientation(gestureHistory);
        if (newGesture) {
          detectedGesture = newGesture;
          gestureConfidence = Math.min(1, velocity / 100);
          lastGestureTime = currentTime;
        }
      }
      
      drawTrail(p5, gestureHistory);
      
      p5.fill(255);
      p5.textSize(12);
      p5.textAlign(p5.LEFT, p5.TOP);
      p5.text(`速度: ${velocity.toFixed(1)} px/s`, 10, 10);
      p5.text(`置信度: ${(gestureConfidence * 100).toFixed(0)}%`, 10, 30);
      p5.text(`手掌朝向: ${currentPalmOrientation}`, 10, 50);
      p5.text(`手掌尺寸: ${handSize.toFixed(0)}`, 10, 70);
    } else {
      gestureHistory = [];
      smoothedPositions = [];
      detectedGesture = "";
      currentPalmOrientation = "";
    }
    
    if (detectedGesture) {
      p5.fill(255, 255, 0);
      p5.noStroke();
      p5.textSize(32);
      p5.textAlign(p5.CENTER, p5.TOP);
      p5.text(detectedGesture, p5.width / 2, 20);
    }
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

  const drawTrail = (p5: p5Types, history: { x: number; y: number }[]) => {
    p5.noFill();
    p5.stroke(255, 0, 255);
    p5.strokeWeight(3);
    p5.beginShape();
    for (let i = 0; i < history.length; i++) {
      p5.vertex(history[i].x, history[i].y);
    }
    p5.endShape();
  };

  const recognizeGestureWithOrientation = (history: { x: number; y: number; time: number; size: number; orientation: string }[]): string => {
    if (history.length < 15) return "";
    
    const start = history[0];
    const end = history[history.length - 1];
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    const sizeChange = end.size - start.size;
    const sizeChangePercent = (sizeChange / start.size) * 100;
    
    const recentOrientations = history.slice(-10).map(h => h.orientation);
    const dominantOrientation = getMostFrequent(recentOrientations);
    
    const timeDelta = end.time - start.time;
    const minDistance = Math.max(60, timeDelta / 20);
    
    if (Math.abs(sizeChangePercent) > 15 && distance < 80) {
      if (sizeChange > 0) {
        return `👋 ${dominantOrientation} - 向前`;
      } else {
        return `✋ ${dominantOrientation} - 向后`;
      }
    }
    
    if (distance < minDistance) return "";
    
    const angle = Math.atan2(deltaY, deltaX);
    const angleDeg = (angle * 180 / Math.PI + 360) % 360;
    
    const pathStraightness = calculatePathStraightness(history);
    
    if (pathStraightness > 0.65) {
      if ((angleDeg < 30 || angleDeg > 330)) {
        return `👉 ${dominantOrientation} - 向右`;
      } else if (angleDeg > 150 && angleDeg < 210) {
        return `👈 ${dominantOrientation} - 向左`;
      } else if (angleDeg > 60 && angleDeg < 120) {
        return `👇 ${dominantOrientation} - 向下`;
      } else if (angleDeg > 240 && angleDeg < 300) {
        return `👆 ${dominantOrientation} - 向上`;
      }
    }
    
    if (isWaving(history)) {
      return `👋 ${dominantOrientation} - 挥手`;
    }
    
    if (isCircular(history)) {
      return `⭕ ${dominantOrientation} - 画圈`;
    }
    
    return "";
  };

  const getMostFrequent = (arr: string[]): string => {
    const frequency: { [key: string]: number } = {};
    let maxFreq = 0;
    let mostFrequent = "";
    
    for (const item of arr) {
      frequency[item] = (frequency[item] || 0) + 1;
      if (frequency[item] > maxFreq) {
        maxFreq = frequency[item];
        mostFrequent = item;
      }
    }
    
    return mostFrequent;
  };

  const calculatePathStraightness = (history: { x: number; y: number }[]): number => {
    if (history.length < 3) return 0;
    
    const start = history[0];
    const end = history[history.length - 1];
    const directDistance = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
    );
    
    let pathLength = 0;
    for (let i = 1; i < history.length; i++) {
      pathLength += Math.sqrt(
        Math.pow(history[i].x - history[i - 1].x, 2) +
        Math.pow(history[i].y - history[i - 1].y, 2)
      );
    }
    
    return pathLength > 0 ? directDistance / pathLength : 0;
  };

  const isWaving = (history: { x: number; y: number }[]): boolean => {
    const sampleInterval = 3;
    let directionChanges = 0;
    let prevDirection = 0;
    let peaks = 0;
    
    for (let i = sampleInterval; i < history.length; i += sampleInterval) {
      const deltaX = history[i].x - history[i - sampleInterval].x;
      const currentDirection = deltaX > 5 ? 1 : deltaX < -5 ? -1 : 0;
      
      if (currentDirection !== 0 && currentDirection !== prevDirection && prevDirection !== 0) {
        directionChanges++;
        peaks++;
      }
      
      if (currentDirection !== 0) {
        prevDirection = currentDirection;
      }
    }
    
    const deltaY = Math.abs(history[history.length - 1].y - history[0].y);
    const deltaX = Math.abs(history[history.length - 1].x - history[0].x);
    
    return directionChanges >= 2 && peaks >= 2 && deltaY < deltaX * 0.8;
  };

  const isCircular = (history: { x: number; y: number }[]): boolean => {
    if (history.length < 20) return false;
    
    const start = history[0];
    const end = history[history.length - 1];
    const startEndDist = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
    );
    
    let totalDist = 0;
    for (let i = 1; i < history.length; i++) {
      totalDist += Math.sqrt(
        Math.pow(history[i].x - history[i - 1].x, 2) +
        Math.pow(history[i].y - history[i - 1].y, 2)
      );
    }
    
    const centerX = history.reduce((sum, p) => sum + p.x, 0) / history.length;
    const centerY = history.reduce((sum, p) => sum + p.y, 0) / history.length;
    
    const distances = history.map(p => 
      Math.sqrt(Math.pow(p.x - centerX, 2) + Math.pow(p.y - centerY, 2))
    );
    
    const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
    const variance = distances.reduce((sum, d) => sum + Math.pow(d - avgDistance, 2), 0) / distances.length;
    const stdDev = Math.sqrt(variance);
    
    let totalAngleChange = 0;
    for (let i = 1; i < history.length; i++) {
      const angle1 = Math.atan2(history[i - 1].y - centerY, history[i - 1].x - centerX);
      const angle2 = Math.atan2(history[i].y - centerY, history[i].x - centerX);
      let angleDiff = angle2 - angle1;
      
      if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
      
      totalAngleChange += Math.abs(angleDiff);
    }
    
    return startEndDist < 60 && 
           totalDist > 200 && 
           stdDev / avgDistance < 0.3 &&
           totalAngleChange > Math.PI * 1.5;
  };

  return <Sketch setup={setup} draw={draw} />;
}
