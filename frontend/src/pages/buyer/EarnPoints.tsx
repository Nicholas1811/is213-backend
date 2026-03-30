import { useState, useEffect } from "react";
import { Camera, Check, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import CameraCapture from "@/components/camera/CameraCapture";
import { POINTS_PER_MEAL_PHOTO } from "@/lib/constants";
import {
  createPhotoProcess,
  getPhotoStatus,
  submitMealPhotos,
  uploadAfterMealPhoto,
  uploadBeforeMealPhoto
} from "@/api/pointsEndpoints";
import {uploadImageToS3, fetchImageUrl} from "@/api/s3";

type Step = "before" | "after" | "submitted";

export default function EarnPoints() {
  const [step, setStep] = useState<Step>("before");
  const [beforePhoto, setBeforePhoto] = useState<Blob | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<Blob | null>(null);
  const [isUploadingBefore, setIsUploadingBefore] = useState(false);
  const [beforeUploadError, setBeforeUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);

  // async function handleBeforeUpload() {
  //   const file = new File([beforePhoto], "before.jpg", { type: beforePhoto.type });
  //   if (!beforePhoto) {
  //     setBeforeUploadError("Capture your before photo first.");
  //     return;
  //   }
  //
  //   setIsUploadingBefore(true);
  //   setBeforeUploadError(null);
  //
  //   try {
  //     await uploadImageToS3(beforePhoto);
  //
  //     await uploadBeforeMealPhoto(beforePhoto);
  //     setStep("after");
  //   } catch (error) {
  //     console.error("Failed to upload before photo", error);
  //     setBeforeUploadError("Could not upload before photo. Please try again.");
  //   } finally {
  //     setIsUploadingBefore(false);
  //   }
  // }
  async function handleBeforeUpload() {
    if (!beforePhoto) {
      setBeforeUploadError("Capture your before photo first.");
      return;
    }

    setIsUploadingBefore(true);
    setBeforeUploadError(null);

    try {
      const file = new File([beforePhoto], "before.jpg", { type: beforePhoto.type });

      const key = await uploadImageToS3(file);
      const fileURL = await fetchImageUrl(key);
      const photoProcess = await createPhotoProcess(fileURL);
      setTransactionId(photoProcess.id);
      console.log("S3 upload success, key:", key);
      console.log(fileURL);

      setStep("after"); // move to next step
    } catch (error) {
      console.error("Failed to upload before photo", error);
      setBeforeUploadError("Could not upload before photo. Please try again.");
    } finally {
      setIsUploadingBefore(false);
    }
  }

  async function handleSubmit(afterBlob: Blob) {
    if (!beforePhoto || !transactionId) {
      setBeforeUploadError("Missing transaction. Please restart.");
      setStep("before");
      return;
    }

    setAfterPhoto(afterBlob);
    setIsSubmitting(true);

    try {
      const file = new File([afterBlob], "after.jpg", { type: afterBlob.type });

      const key = await uploadImageToS3(file);
      const afterUrl = await fetchImageUrl(key);

      console.log("After URL:", afterUrl);

      await uploadAfterMealPhoto(transactionId, afterUrl);

      setStep("processing");
    } catch (error) {
      console.error("Failed to submit after photo", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleReset() {
    setStep("before");
    setBeforePhoto(null);
    setAfterPhoto(null);
    setBeforeUploadError(null);
  }

  useEffect(() => {
    if (step !== "processing" || !transactionId) return;

    const interval = setInterval(async () => {
      try {
        const res = await getPhotoStatus(transactionId);

        console.log("Polling status:", res.status);

        if (res.status === "awarded") {
          setStep("submitted");
          clearInterval(interval);
        }

        if (res.status === "rejected") {
          // optional: show rejection UI
          clearInterval(interval);
        }

      } catch (err) {
        console.error("Polling error", err);
      }
    }, 3000); // every 3s

    return () => clearInterval(interval);
  }, [step, transactionId]);

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
              Take a photo of your meal before you start eating. Then upload it to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <CameraCapture
              label="Capture your meal before eating"
              onCapture={(blob) => {
                setBeforePhoto(blob);
                setBeforeUploadError(null);
              }}
            />

            <Button
              onClick={handleBeforeUpload}
              disabled={!beforePhoto || isUploadingBefore}
              className="w-full"
            >
              {isUploadingBefore ? "Uploading before photo..." : "Upload Before Photo"}
            </Button>

            {beforeUploadError && (
              <p className="text-sm text-destructive text-center">{beforeUploadError}</p>
            )}
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

      {step === "processing" && (
          <Card className="border-primary/50">
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 animate-pulse">
                <Coins className="h-8 w-8 text-primary" />
              </div>

              <h2 className="text-2xl font-bold">Processing Your Meal...</h2>

              <p className="text-muted-foreground">
                We are verifying your meal photos. This may take a few moments.
              </p>

              <p className="text-sm text-muted-foreground animate-pulse">
                AI is analyzing your submission...
              </p>
            </CardContent>
          </Card>
      )}

      {step === "rejected" && (
          <Card className="border-destructive/50">
            <CardContent className="pt-8 pb-8 text-center space-y-4">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <Camera className="h-8 w-8 text-destructive" />
              </div>

              <h2 className="text-2xl font-bold text-destructive">
                Submission Not Approved
              </h2>

              <p className="text-muted-foreground">
                We couldn’t verify that the meal was completed successfully.
              </p>

              <div className="text-sm text-muted-foreground space-y-1">
                <p>• The meal may not be fully finished</p>
                <p>• The before and after photos may not match</p>
                <p>• The result was unclear</p>
              </div>

              <Button onClick={handleReset} className="gap-2 mt-2">
                <Camera className="h-4 w-4" />
                Try Again
              </Button>
            </CardContent>
          </Card>
      )}

      {afterPhoto && step === "submitted" && (
        <p className="text-center text-xs text-muted-foreground">After photo captured successfully.</p>
      )}


    </div>
  );
}
