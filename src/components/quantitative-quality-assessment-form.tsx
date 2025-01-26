"use client";

// import { useRouter } from "next/navigation";
// import { useState } from "react";

type QuantitativeQualityAssessmentFormProps = {
  projectId: string;
};

export function QuantitativeQualityAssessmentForm({
  projectId,
}: QuantitativeQualityAssessmentFormProps) {
  //   const router = useRouter();
  //   const [isSubmitting, setIsSubmitting] = useState(false);

  return <div>{projectId}定量品質評価フォーム</div>;
}
