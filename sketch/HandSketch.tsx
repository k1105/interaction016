import dynamic from "next/dynamic";
import p5Types from "p5";
import { MutableRefObject, useRef } from "react";
import { Hand } from "@tensorflow-models/hand-pose-detection";
import { getSmoothedHandpose } from "../lib/getSmoothedHandpose";
import { updateHandposeHistory } from "../lib/updateHandposeHistory";
import { Keypoint } from "@tensorflow-models/hand-pose-detection";
import { convertHandToHandpose } from "../lib/converter/convertHandToHandpose";
import { dotHand } from "../lib/p5/dotHand";
import { isFront } from "../lib/calculator/isFront";
import { Monitor } from "./Monitor";

type Props = {
  handpose: MutableRefObject<Hand[]>;
};

let leftHand: Keypoint[] = [];
let rightHand: Keypoint[] = [];
let leftHandOpacity: number = 0;
let rightHandOpacity: number = 0;
const pos = { x: 0, y: 0 };
let t = 0;
const r = 200;
const inner_r = 20;

type Handpose = Keypoint[];

const Sketch = dynamic(import("react-p5"), {
  loading: () => <></>,
  ssr: false,
});

export const HandSketch = ({ handpose }: Props) => {
  let handposeHistory: {
    left: Handpose[];
    right: Handpose[];
  } = { left: [], right: [] };

  const debugLog = useRef<{ label: string; value: any }[]>([]);

  const preload = (p5: p5Types) => {
    // 画像などのロードを行う
  };

  const setup = (p5: p5Types, canvasParentRef: Element) => {
    p5.createCanvas(p5.windowWidth, p5.windowHeight).parent(canvasParentRef);
    p5.stroke(220);
    p5.noFill();
    p5.strokeWeight(10);
  };

  const draw = (p5: p5Types) => {
    const rawHands: {
      left: Handpose;
      right: Handpose;
    } = convertHandToHandpose(handpose.current); //平滑化されていない手指の動きを使用する
    handposeHistory = updateHandposeHistory(rawHands, handposeHistory); //handposeHistoryの更新
    const hands: {
      left: Handpose;
      right: Handpose;
    } = getSmoothedHandpose(rawHands, handposeHistory); //平滑化された手指の動きを取得する

    // logとしてmonitorに表示する
    debugLog.current = [];
    for (const hand of handpose.current) {
      debugLog.current.push({
        label: hand.handedness + " accuracy",
        value: hand.score,
      });
      debugLog.current.push({
        label: hand.handedness + " is front",
        //@ts-ignore
        value: isFront(hand.keypoints, hand.handedness.toLowerCase()),
      });
    }

    p5.clear();
    if (hands.left.length > 0) {
      leftHand = hands.left;
      leftHandOpacity = Math.min(255, leftHandOpacity + 255 / 10);
    } else {
      leftHandOpacity = Math.max(0, leftHandOpacity - 255 / 10);
    }

    if (hands.right.length > 0) {
      rightHand = hands.right;
      rightHandOpacity = Math.min(255, rightHandOpacity + 255 / 10);
    } else {
      rightHandOpacity = Math.max(0, rightHandOpacity - 255 / 10);
    }

    if (leftHand.length > 0 && rightHand.length > 0) {
      p5.push();
      p5.stroke(220);
      p5.translate(p5.width / 2 + r, p5.height / 2);
      t += 0.1;
      const delta = (2 * Math.PI) / 10;
      for (let i = 0; i < 10; i++) {
        let d = 0;
        if (i < 5) {
          d = 2 * leftHand[4 * i + 1].y - leftHand[4 * i + 4].y;
        } else {
          d = 2 * rightHand[4 * (i - 5) + 1].y - rightHand[4 * (i - 5) + 4].y;
        }

        pos.x = d;
        pos.y = 50;
        p5.bezier(0, 0, pos.x, pos.y, pos.x, pos.y, 0, 100);
        p5.translate(0, 100);
        p5.rotate(delta);
      }
      p5.pop();
    }
  };

  const windowResized = (p5: p5Types) => {
    p5.resizeCanvas(p5.windowWidth, p5.windowHeight);
  };

  return (
    <>
      <Monitor handpose={handpose} debugLog={debugLog} />
      <Sketch
        preload={preload}
        setup={setup}
        draw={draw}
        windowResized={windowResized}
      />
    </>
  );
};
