import { useState } from "react";
import { Camera, Check, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import CameraCapture from "@/components/camera/CameraCapture";
import { POINTS_PER_MEAL_PHOTO } from "@/lib/constants";

type Step = "before" | "after" | "submitted";

export default function EarnPoints() {
  const [step, setStep] = useState<Step>("before");
  const [_beforePhoto, setBeforePhoto] = useState<Blob | null>(null);
  const [_afterPhoto, setAfterPhoto] = useState<Blob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(afterBlob: Blob) {
    setAfterPhoto(afterBlob);
    setIsSubmitting(true);

    // TODO: Replace with actual API call to points-service
    // await submitMealPhotos({ beforePhoto, afterPhoto: afterBlob })
    await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate API call

    setIsSubmitting(false);
    setStep("submitted");
  }

  function handleReset() {
    setStep("before");
    setBeforePhoto(null);
    setAfterPhoto(null);
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Earn Points</h1>
        <p className="text-muted-foreground mt-1">
          Take photos of your meal to earn {POINTS_PER_MEAL_PHOTO} points
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-4">
        <div className={`flex items-center gap-2 ${step === "before" ? "text-primary font-semibold" : "text-muted-foreground"}`}>
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
            step === "before" ? "bg-primary text-primary-foreground" : "bg-primary text-primary-foreground"
          }`}>
            {step === "before" ? "1" : <Check className="h-4 w-4" />}
          </div>
          <span className="text-sm">Before</span>
        </div>
        <div className={`h-0.5 w-12 rounded-full ${step !== "before" ? "bg-primary" : "bg-border"}`} />
        <div className={`flex items-center gap-2 ${step === "after" ? "text-primary font-semibold" : "text-muted-foreground"}`}>
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
            step === "after" ? "bg-primary text-primary-foreground" :
            step === "submitted" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}>
            {step === "submitted" ? <Check className="h-4 w-4" /> : "2"}
          </div>
          <span className="text-sm">After</span>
        </div>
        <div className={`h-0.5 w-12 rounded-full ${step === "submitted" ? "bg-primary" : "bg-border"}`} />
        <div className={`flex items-center gap-2 ${step === "submitted" ? "text-primary font-semibold" : "text-muted-foreground"}`}>
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
            step === "submitted" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}>
            <Coins className="h-4 w-4" />
          </div>
          <span className="text-sm">Earn</span>
        </div>
      </div>

      {/* Step Content */}
      {step === "before" && (
        <Card>
          <CardHeader className="text-center">
            <Camera className="mx-auto h-8 w-8 text-primary mb-2" />
            <CardTitle>Before Your Meal</CardTitle>
            <CardDescription>
              Take a photo of your meal before you start eating. Make sure to capture the full plate!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CameraCapture
              label="Capture your meal before eating"
              onCapture={(blob) => {
                setBeforePhoto(blob);
                setStep("after");
              }}
            />
          </CardContent>
        </Card>
      )}

      {step === "after" && (
        <Card>
          <CardHeader className="text-center">
            <Camera className="mx-auto h-8 w-8 text-primary mb-2" />
            <CardTitle>After Your Meal</CardTitle>
            <CardDescription>
              Now take a photo after you&apos;ve finished eating. Show us your clean plate!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <CameraCapture
              label="Capture your plate after eating"
              onCapture={handleSubmit}
            />
            {isSubmitting && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground animate-pulse">
                  Submitting your photos...
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === "submitted" && (
        <Card className="border-primary/50">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Coins className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Points Earned!</h2>
            <p className="text-4xl font-bold text-primary">
              +{POINTS_PER_MEAL_PHOTO} pts
            </p>
            <p className="text-muted-foreground">
              Great job reducing food waste! Your points have been added to your balance.
            </p>
            <Button onClick={handleReset} className="gap-2">
              <Camera className="h-4 w-4" />
              Submit Another Meal
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
