import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Upload, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORIES = ["Salads", "Pasta", "Japanese", "Pizza", "Bowls", "Thai", "Burgers", "Desserts", "Beverages", "Other"];

interface FormData {
  name: string;
  description: string;
  category: string;
  originalPrice: string;
  discountedPrice: string;
  quantity: string;
  imageFile: File | null;
}

type SubmitStep = "form" | "submitting" | "success";

export default function ManualListingForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState<SubmitStep>("form");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({
    name: "",
    description: "",
    category: "",
    originalPrice: "",
    discountedPrice: "",
    quantity: "",
    imageFile: null,
  });

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      updateField("imageFile", file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStep("submitting");

    // Simulate API call — will be replaced with TanStack mutation
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setStep("success");
  }

  const isFormValid =
    form.name.trim() !== "" &&
    form.description.trim() !== "" &&
    form.category !== "" &&
    form.originalPrice !== "" &&
    form.discountedPrice !== "" &&
    form.quantity !== "" &&
    Number(form.discountedPrice) < Number(form.originalPrice) &&
    Number(form.quantity) > 0;

  // Success State
  if (step === "success") {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle2 className="h-10 w-10 text-primary" />
        </div>
        <h2 className="mt-6 text-2xl font-bold">Listing Created!</h2>
        <p className="mt-2 text-muted-foreground text-center max-w-md">
          Your listing has been created successfully and is now active on the marketplace.
        </p>
        <div className="mt-8 flex gap-3">
          <Button onClick={() => navigate("/seller/listings")}>
            View My Listings
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setStep("form");
              setForm({
                name: "",
                description: "",
                category: "",
                originalPrice: "",
                discountedPrice: "",
                quantity: "",
                imageFile: null,
              });
              setImagePreview(null);
            }}
          >
            Create Another
          </Button>
        </div>
      </div>
    );
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
          <h1 className="text-3xl font-bold tracking-tight">Manual Listing</h1>
          <p className="text-muted-foreground mt-1">
            Fill in the details for your meal listing
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Listing Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Meal Name</Label>
              <Input
                id="name"
                placeholder="e.g. Grilled Chicken Salad"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                placeholder="Describe your meal..."
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(value) => updateField("category", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pricing Row */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="originalPrice">Original Price ($)</Label>
                <Input
                  id="originalPrice"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={form.originalPrice}
                  onChange={(e) => updateField("originalPrice", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discountedPrice">Discounted Price ($)</Label>
                <Input
                  id="discountedPrice"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={form.discountedPrice}
                  onChange={(e) =>
                    updateField("discountedPrice", e.target.value)
                  }
                  required
                />
                {form.originalPrice &&
                  form.discountedPrice &&
                  Number(form.discountedPrice) >= Number(form.originalPrice) && (
                    <p className="text-xs text-destructive">
                      Discounted price must be less than original price
                    </p>
                  )}
                {form.originalPrice &&
                  form.discountedPrice &&
                  Number(form.discountedPrice) < Number(form.originalPrice) && (
                    <p className="text-xs text-primary">
                      {Math.round(
                        ((Number(form.originalPrice) -
                          Number(form.discountedPrice)) /
                          Number(form.originalPrice)) *
                          100
                      )}
                      % savings for buyers
                    </p>
                  )}
              </div>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Available Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                placeholder="How many available?"
                value={form.quantity}
                onChange={(e) => updateField("quantity", e.target.value)}
                required
              />
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Meal Photo</Label>
              <div className="flex items-center gap-4">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-32 w-32 rounded-lg object-cover border"
                  />
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25">
                    <Upload className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                )}
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload a photo of your meal (JPEG, PNG)
                  </p>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={!isFormValid || step === "submitting"}
                className="gap-2"
              >
                {step === "submitting" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Listing"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/seller/create")}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
