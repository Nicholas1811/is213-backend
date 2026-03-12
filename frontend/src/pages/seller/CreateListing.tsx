import { Link } from "react-router-dom";
import { PenLine, Sparkles, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CreateListing() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/seller">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Listing</h1>
          <p className="text-muted-foreground mt-1">
            Choose how you'd like to create your listing
          </p>
        </div>
      </div>

      {/* Options */}
      <div className="grid gap-6 sm:grid-cols-2 max-w-3xl">
        {/* Manual */}
        <Card className="transition-all hover:shadow-md hover:border-primary/50">
          <CardHeader>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 mb-3">
              <PenLine className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-xl">Manual Entry</CardTitle>
            <CardDescription>
              Fill out a form with your meal details, pricing, and photos. Best
              for single listings with specific details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/seller/create/manual">
              <Button variant="outline" className="w-full">
                Create Manually
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* AI-Assisted */}
        <Card className="transition-all hover:shadow-md hover:border-primary/50 relative overflow-hidden">
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
              <Sparkles className="h-3 w-3" />
              AI Powered
            </span>
          </div>
          <CardHeader>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 mb-3">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-xl">AI-Assisted</CardTitle>
            <CardDescription>
              Upload photos of your meals and our AI will generate listing
              details automatically. Create up to 10 listings at once.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/seller/create/ai">
              <Button className="w-full">
                Create with AI
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
