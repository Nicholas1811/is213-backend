import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, RotateCcw, Check } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (photo: Blob) => void;
  label?: string;
  className?: string;
}

export default function CameraCapture({ onCapture, label = "Take Photo", className = "" }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const startCamera = useCallback(async () => {
    setIsStarting(true);
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Prefer back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      setStream(mediaStream);
    } catch (err) {
      console.error("Camera access error:", err);
      setError("Unable to access camera. Please allow camera permissions.");
    } finally {
      setIsStarting(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    // Convert to blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const imageUrl = URL.createObjectURL(blob);
          setCapturedImage(imageUrl);
          onCapture(blob);
          stopCamera();
        }
      },
      "image/jpeg",
      0.85
    );
  }, [onCapture, stopCamera]);

  const retake = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  // Attach stream to video element after render
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>

      {/* Camera view */}
      {!capturedImage && !stream && !isStarting && (
        <Button onClick={startCamera} className="gap-2" size="lg">
          <Camera className="h-5 w-5" />
          Open Camera
        </Button>
      )}

      {isStarting && (
        <div className="w-full max-w-md aspect-[4/3] bg-muted rounded-lg flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Starting camera...</p>
        </div>
      )}

      {error && (
        <div className="w-full max-w-md p-4 bg-destructive/10 rounded-lg text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={startCamera}>
            Try Again
          </Button>
        </div>
      )}

      {stream && !capturedImage && (
        <div className="w-full max-w-md">
          <div className="relative rounded-lg overflow-hidden border-2 border-primary">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full aspect-[4/3] object-cover"
            />
          </div>
          <Button onClick={capturePhoto} className="w-full mt-3 gap-2" size="lg">
            <Camera className="h-5 w-5" />
            Capture
          </Button>
        </div>
      )}

      {/* Captured preview */}
      {capturedImage && (
        <div className="w-full max-w-md">
          <div className="relative rounded-lg overflow-hidden border-2 border-primary">
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full aspect-[4/3] object-cover"
            />
            <div className="absolute top-2 right-2">
              <Badge />
            </div>
          </div>
          <Button variant="outline" onClick={retake} className="w-full mt-3 gap-2">
            <RotateCcw className="h-4 w-4" />
            Retake
          </Button>
        </div>
      )}

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

function Badge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
      <Check className="h-3 w-3" />
      Captured
    </span>
  );
}
