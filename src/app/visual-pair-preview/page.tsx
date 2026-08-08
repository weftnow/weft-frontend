import { PairResultView } from "@/features/demo-b2c/components/PairResultView";
import type { PairResult } from "@/features/demo-b2c/types/contracts";

const VALUE = {
  key: "BE",
  name: "Benevolence",
  tagline: "care up close",
  blurb: "You both make room for the people directly in front of you.",
};

const RESULT: PairResult = {
  headline: "Ariana and Daniel both lead with Benevolence.",
  score: 0.72,
  percent: 86,
  band: "Great match",
  shared_values: [
    VALUE,
    {
      key: "SD",
      name: "Self-direction",
      tagline: "curiosity in motion",
      blurb: "You share an appetite for learning, making, and finding your own way.",
    },
  ],
  difference: "Your clearest difference is the pace at which you like a connection to unfold.",
  people: [
    {
      name: "Ariana Lee",
      top_values: [VALUE],
      humour: "warm and affiliative",
      opens_up: "opens up quickly",
      pace: "likes a steady rhythm",
      life_stage: "building outward",
    },
    {
      name: "Daniel Kim",
      top_values: [VALUE],
      humour: "dry and observational",
      opens_up: "opens up gradually",
      pace: "likes a steady rhythm",
      life_stage: "building inward",
    },
  ],
};

export default function VisualPairPage() {
  return <PairResultView result={RESULT} shareToken="preview-share-token" />;
}
