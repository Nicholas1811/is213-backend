import { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Upload,
  Sparkles,
  CheckCircle2,
  XCircle,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MAX_AI_LISTINGS } from "@/lib/constants";
import { uploadImageToS3 } from "@/api/s3";
import { batchCreateListings } from "@/api/listingEndpoints";

type FlowStep = "upload" | "processing";

interface ImageFile {
  file: File;
  preview: string;
}

// --- Neural Network Animation Nodes ---

interface NodeData {
  id: number;
  x: number;
  y: number;
  layer: number;
}

function generateNodes(): NodeData[] {
  const nodes: NodeData[] = [];
  const layers = [3, 5, 7, 5, 3];
  let id = 0;

  layers.forEach((count, layerIndex) => {
    const xPos = 10 + (layerIndex / (layers.length - 1)) * 80;
    for (let i = 0; i < count; i++) {
      const yPos = ((i + 1) / (count + 1)) * 100;
      nodes.push({ id: id++, x: xPos, y: yPos, layer: layerIndex });
    }
  });

  return nodes;
}

interface NodeConnection {
  from: NodeData;
  to: NodeData;
}

function generateConnections(nodes: NodeData[]): NodeConnection[] {
  const connections: NodeConnection[] = [];
  const maxLayer = Math.max(...nodes.map((n) => n.layer));

  for (let layer = 0; layer < maxLayer; layer++) {
    const fromNodes = nodes.filter((n) => n.layer === layer);
    const toNodes = nodes.filter((n) => n.layer === layer + 1);
    fromNodes.forEach((from) => {
      toNodes.forEach((to) => {
        connections.push({ from, to });
      });
    });
  }

  return connections;
}

const NETWORK_NODES = generateNodes();
const NETWORK_CONNECTIONS = generateConnections(NETWORK_NODES);

function NeuralNetworkAnimation({ progress }: { progress: number }) {
  return (
    <div className="space-y-4">
      {/* SVG Network */}
      <div className="relative w-full h-[420px] overflow-hidden rounded-xl bg-muted/30 border">
        <svg
          viewBox="0 10 100 80"
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          {/* Connections */}
          {NETWORK_CONNECTIONS.map((conn, i) => {
            const isActive = progress > (conn.from.layer / 4) * 100;
            return (
              <motion.line
                key={`conn-${i}`}
                x1={conn.from.x}
                y1={conn.from.y}
                x2={conn.to.x}
                y2={conn.to.y}
                stroke={isActive ? "oklch(0.65 0.2 155)" : "oklch(0.85 0.05 155 / 0.3)"}
                strokeWidth={0.25}
                initial={{ opacity: 0 }}
                animate={{ opacity: isActive ? 0.6 : 0.15 }}
                transition={{ duration: 0.5, delay: i * 0.01 }}
              />
            );
          })}

          {/* Nodes */}
          {NETWORK_NODES.map((node) => {
            const isActive = progress > (node.layer / 4) * 100;
            return (
              <motion.circle
                key={`node-${node.id}`}
                cx={node.x}
                cy={node.y}
                r={2.2}
                fill={isActive ? "oklch(0.65 0.2 155)" : "oklch(0.9 0.05 155)"}
                stroke={isActive ? "oklch(0.55 0.2 155)" : "oklch(0.8 0.05 155)"}
                strokeWidth={0.3}
                initial={{ scale: 0 }}
                animate={{
                  scale: isActive ? [1, 1.3, 1] : 1,
                }}
                transition={{
                  duration: 1.5,
                  repeat: isActive ? Infinity : 0,
                  delay: node.id * 0.05,
                }}
              />
            );
          })}

          {/* Pulse traveling through the network */}
          {NETWORK_NODES.filter((n) => {
            const layerProgress = (progress / 100) * 4;
            return Math.abs(n.layer - layerProgress) < 0.8;
          }).map((node) => (
            <motion.circle
              key={`pulse-${node.id}`}
              cx={node.x}
              cy={node.y}
              r={3}
              fill="none"
              stroke="oklch(0.65 0.2 155)"
              strokeWidth={0.4}
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: node.id * 0.1,
              }}
            />
          ))}
        </svg>
      </div>

      {/* Progress bar — below the SVG */}
      <div>
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted-foreground font-medium">
            Analyzing your images...
          </span>
          <span className="text-primary font-bold">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
    </div>
  );
}

// --- Main Component ---

export default function AIListingFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState<FlowStep>("upload");
  const [images, setImages] = useState<ImageFile[]>([]);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Handle image selection
  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      const newImages: ImageFile[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        newImages.push({
          file,
          preview: URL.createObjectURL(file),
        });
      }

      setImages((prev) => [...prev, ...newImages].slice(0, MAX_AI_LISTINGS));
    },
    []
  );

  function removeImage(index: number) {
    setImages((prev) => {
      const removed = prev[index];
      URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function startProcessing() {
    setUploadError(null);
    setProgress(0);
    setStep("processing");

    try {
      let completed = 0;
      const imageUrls = await Promise.all(
        images.map(async ({ file }) => {
          const url = await uploadImageToS3(file);
          completed++;
          setProgress((completed / images.length) * 100);
          return url;
        })
      );

      await batchCreateListings(imageUrls);
      navigate("/seller/listings");
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      setStep("upload");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/seller/create">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            AI-Assisted Listing
          </h1>
          <p className="text-muted-foreground mt-1">
            {step === "upload" && "Upload photos and let AI create your listings"}
            {step === "processing" && "Uploading images and creating listings..."}
          </p>
        </div>
      </div>

      {/* Step Indicators */}
      <div className="flex items-center gap-4">
        {(["upload", "processing"] as const).map((s, i) => {
          const stepLabels = ["Upload", "Processing"];
          const stepNumber = i + 1;
          const isCurrent = s === step;
          const isCompleted = s === "upload" && step === "processing";

          return (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && (
                <div
                  className={`h-px w-8 ${isCompleted || isCurrent ? "bg-primary" : "bg-muted"}`}
                />
              )}
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  isCompleted
                    ? "bg-primary text-primary-foreground"
                    : isCurrent
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  stepNumber
                )}
              </div>
              <span
                className={`text-sm ${isCurrent || isCompleted ? "font-semibold text-foreground" : "text-muted-foreground"}`}
              >
                {stepLabels[i]}
              </span>
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Upload */}
        {step === "upload" && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {/* Image Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Upload Meal Photos
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Each image will generate one listing. Upload up to {MAX_AI_LISTINGS} images.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Upload Area */}
                <label className="flex flex-col items-center justify-center h-40 rounded-xl border-2 border-dashed border-muted-foreground/25 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
                  <Upload className="h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm font-medium">Click to upload images</p>
                  <p className="text-xs text-muted-foreground">
                    JPEG, PNG (up to {MAX_AI_LISTINGS} images)
                  </p>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>

                {/* Image Previews */}
                {images.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                    {images.map((img, i) => (
                      <div key={i} className="relative group">
                        <img
                          src={img.preview}
                          alt={`Upload ${i + 1}`}
                          className="h-24 w-full rounded-lg object-cover border"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  {images.length} of {MAX_AI_LISTINGS} images uploaded
                  {images.length > 0 && (
                    <> &mdash; will generate <span className="font-semibold text-foreground">{images.length}</span> listing{images.length !== 1 ? "s" : ""}</>
                  )}
                </p>
              </CardContent>
            </Card>

            {uploadError && (
              <p className="text-sm text-destructive">{uploadError}</p>
            )}

            {/* Start Button */}
            <Button
              size="lg"
              className="gap-2"
              onClick={startProcessing}
              disabled={images.length === 0}
            >
              <Sparkles className="h-4 w-4" />
              Generate {images.length} Listing{images.length !== 1 ? "s" : ""} with AI
            </Button>
          </motion.div>
        )}

        {/* Step 2: Processing */}
        {step === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI Processing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <NeuralNetworkAnimation progress={progress} />

                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Our AI is identifying meals, generating descriptions, and
                    suggesting prices based on your images.
                  </p>
                  <div className="flex items-center justify-center gap-2 text-primary">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium">
                      Processing {images.length} listing
                      {images.length !== 1 ? "s" : ""}...
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
