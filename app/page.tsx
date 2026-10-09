"use client";

import { useEffect, useState } from "react";
import { AdminView } from "@/app/components/admin-view";
import { AuthView } from "@/app/components/auth-view";
import { CitizenView } from "@/app/components/citizen-view";
import { LandingView } from "@/app/components/landing-view";
import { SiteHeader } from "@/app/components/ui";
import { SAMPLE_ISSUES, asIssues, composeDescription, type Issue } from "@/lib/issues";
import { isSupabaseConfigured, supabase } from "@/utils/supabase";

type View = "home" | "login" | "user-dashboard" | "admin-dashboard";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read that photo."));
    reader.readAsDataURL(file);
  });
}

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [booting, setBooting] = useState(isSupabaseConfigured);
  const [signedIn, setSignedIn] = useState(false);
  const [preview, setPreview] = useState(!isSupabaseConfigured);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [photoInputKey, setPhotoInputKey] = useState(0);
  const [formMessage, setFormMessage] = useState("");
  const [formTone, setFormTone] = useState<"error" | "ok" | "info">("info");
  const [submitting, setSubmitting] = useState(false);

  const [myIssues, setMyIssues] = useState<Issue[]>(() => (isSupabaseConfigured ? [] : [...SAMPLE_ISSUES]));
  const [allIssues, setAllIssues] = useState<Issue[]>(() => (isSupabaseConfigured ? [] : [...SAMPLE_ISSUES]));
  const [listLoading, setListLoading] = useState(false);
  const [deskMessage, setDeskMessage] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let ignore = false;

    client.auth
      .getSession()
      .then(async ({ data }) => {
        if (ignore) return;
        const user = data.session?.user;
        if (!user) {
          setBooting(false);
          return;
        }

        setSignedIn(true);
        setPreview(false);
        if (user.email) setEmail(user.email);
        setView("user-dashboard");

        const { data: rows, error } = await client
          .from("issues")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (ignore) return;
        if (error) {
          setFormTone("error");
          setFormMessage(error.message);
        } else {
          setMyIssues(asIssues(rows));
        }
        setBooting(false);
      })
      .catch(() => {
        if (!ignore) setBooting(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  async function loadMine() {
    if (!supabase) return;
    setListLoading(true);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setListLoading(false);
      setFormTone("error");
      setFormMessage("Sign in again to see your reports.");
      return;
    }
    const { data, error } = await supabase
      .from("issues")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false });
    if (error) {
      setFormTone("error");
      setFormMessage(error.message);
    } else {
      setMyIssues(asIssues(data));
    }
    setListLoading(false);
  }

  async function loadAll() {
    if (!supabase) return;
    setListLoading(true);
    const { data, error } = await supabase.from("issues").select("*").order("created_at", { ascending: false });
    if (error) setDeskMessage(error.message);
    else {
      setDeskMessage("");
      setAllIssues(asIssues(data));
    }
    setListLoading(false);
  }

  const openReport = () => {
    if (!supabase || !signedIn) {
      if (!supabase) {
        setPreview(true);
        setView("user-dashboard");
        return;
      }
      setView("login");
      return;
    }
    setPreview(false);
    setListLoading(true);
    setView("user-dashboard");
    void loadMine();
  };

  const handleAuth = async () => {
    if (!supabase) {
      setAuthError("Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to create accounts.");
      setAuthNotice("");
      return;
    }
    if (!email.trim() || password.length < 6) {
      setAuthError("Enter an email and a password of at least 6 characters.");
      setAuthNotice("");
      return;
    }

    setAuthBusy(true);
    setAuthError("");
    setAuthNotice("");

    if (isRegistering) {
      const { error } = await supabase.auth.signUp({ email: email.trim(), password });
      setAuthBusy(false);
      if (error) {
        setAuthError(error.message);
        return;
      }
      setPassword("");
      setIsRegistering(false);
      setAuthNotice("Account created. Sign in with the same email.");
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setAuthBusy(false);
    if (error) {
      setAuthError(error.message);
      return;
    }
    setSignedIn(true);
    setPreview(false);
    if (data.user?.email) setEmail(data.user.email);
    setPassword("");
    setListLoading(true);
    setView("user-dashboard");
    void loadMine();
  };

  const handleLogout = async () => {
    if (supabase && signedIn) await supabase.auth.signOut();
    setSignedIn(false);
    setPreview(!supabase);
    setPassword("");
    setView("home");
    setFormMessage("");
    setCategory("");
    setDescription("");
    setLocation(null);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleCapture = (file: File) => {
    if (file.type && !file.type.startsWith("image/")) {
      setFormTone("error");
      setFormMessage("Choose an image file.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setFormTone("error");
      setFormMessage("That photo is over 8 MB. Choose a smaller one.");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setFormTone("info");
    setFormMessage(location ? "Photo added." : "Photo added. Lock the location next.");
    if (!location) locate();
  };

  const locate = () => {
    if (!navigator.geolocation) {
      setFormTone("error");
      setFormMessage("This browser cannot read your location. Type the coordinates instead.");
      return;
    }
    setFormTone("info");
    setFormMessage("Finding your location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setFormTone("ok");
        setFormMessage("Location locked.");
      },
      () => {
        setFormTone("error");
        setFormMessage("Location was blocked. Allow it, or type the coordinates.");
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  const clearReport = () => {
    setImageFile(null);
    setImagePreview(null);
    setPhotoInputKey((key) => key + 1);
    setDescription("");
    setLocation(null);
  };

  const handleSubmit = async () => {
    if (!imageFile || !location || !category || description.trim().length < 8) {
      setFormTone("error");
      setFormMessage("Add a photo, a location, a category, and a short description.");
      return;
    }

    setSubmitting(true);
    setFormMessage("");

    if (!supabase || preview) {
      try {
        const imageUrl = await readFile(imageFile);
        const local: Issue = {
          id: crypto.randomUUID(),
          user_id: "preview",
          image_url: imageUrl,
          lat: location.lat,
          lng: location.lng,
          description: composeDescription(category, description),
          status: "Pending",
          created_at: new Date().toISOString(),
        };
        setMyIssues((current) => [local, ...(current.length ? current : SAMPLE_ISSUES)]);
        setAllIssues((current) => [local, ...(current.length ? current : SAMPLE_ISSUES)]);
        clearReport();
        setFormTone("ok");
        setFormMessage("Saved in this browser. Connect Supabase to send it to the city desk.");
      } catch (error) {
        setFormTone("error");
        setFormMessage(error instanceof Error ? error.message : "Could not read that photo.");
      }
      setSubmitting(false);
      return;
    }

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        setView("login");
        setFormTone("error");
        setFormMessage("Sign in again before submitting.");
        setSubmitting(false);
        return;
      }

      const extension = imageFile.name.split(".").pop() || "jpg";
      const fileName = `${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("issue-images").upload(fileName, imageFile);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("issue-images").getPublicUrl(fileName);
      const { error: dbError } = await supabase.from("issues").insert([
        {
          user_id: userData.user.id,
          image_url: urlData.publicUrl,
          lat: location.lat,
          lng: location.lng,
          description: composeDescription(category, description),
          status: "Pending",
        },
      ]);
      if (dbError) throw dbError;

      clearReport();
      setFormTone("ok");
      setFormMessage("Report sent. The city desk has it.");
      await loadMine();
    } catch (error) {
      setFormTone("error");
      setFormMessage(error instanceof Error ? error.message : "Could not submit that report.");
    }
    setSubmitting(false);
  };

  const updateIssueStatus = async (id: string, newStatus: string) => {
    const target = allIssues.find((issue) => issue.id === id) ?? myIssues.find((issue) => issue.id === id);
    const previous = target?.status;
    setAllIssues((current) => current.map((issue) => (issue.id === id ? { ...issue, status: newStatus } : issue)));
    setMyIssues((current) => current.map((issue) => (issue.id === id ? { ...issue, status: newStatus } : issue)));

    if (!supabase || !target || target.user_id === "preview" || target.user_id === "sample") return;

    setSavingId(id);
    const { error } = await supabase.from("issues").update({ status: newStatus }).eq("id", id);
    setSavingId(null);
    if (error) {
      setDeskMessage(error.message);
      if (previous) {
        const restore = (issue: Issue) => (issue.id === id ? { ...issue, status: previous } : issue);
        setAllIssues((current) => current.map(restore));
        setMyIssues((current) => current.map(restore));
      }
      return;
    }
    setDeskMessage("");
  };

  if (booting) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-6">
        <SiteHeader />
        <p className="mt-16 text-lg text-muted">Opening your desk...</p>
      </div>
    );
  }

  if (view === "home") {
    return (
      <LandingView
        configured={isSupabaseConfigured}
        onReport={openReport}
        onDesk={() => {
          setView("admin-dashboard");
          if (supabase) void loadAll();
        }}
      />
    );
  }

  if (view === "login") {
    return (
      <AuthView
        configured={isSupabaseConfigured}
        isRegistering={isRegistering}
        email={email}
        password={password}
        error={authError}
        notice={authNotice}
        busy={authBusy}
        onEmail={(value) => {
          setEmail(value);
          setAuthError("");
        }}
        onPassword={(value) => {
          setPassword(value);
          setAuthError("");
        }}
        onSubmit={() => void handleAuth()}
        onToggle={() => {
          setIsRegistering((current) => !current);
          setAuthError("");
          setAuthNotice("");
        }}
        onHome={() => setView("home")}
        onPreview={() => {
          setPreview(true);
          setView("user-dashboard");
        }}
      />
    );
  }

  if (view === "admin-dashboard") {
    return (
      <AdminView
        issues={allIssues}
        loading={listLoading}
        preview={!supabase}
        message={deskMessage}
        savingId={savingId}
        onHome={() => setView("home")}
        onRefresh={() => void loadAll()}
        onStatus={(id, status) => void updateIssueStatus(id, status)}
      />
    );
  }

  return (
    <CitizenView
      email={signedIn ? email : ""}
      preview={preview || !signedIn}
      category={category}
      description={description}
      location={location}
      imageName={imageFile?.name ?? ""}
      imagePreview={imagePreview}
      photoInputKey={photoInputKey}
      issues={myIssues}
      loading={listLoading && signedIn}
      submitting={submitting}
      message={formMessage}
      messageTone={formTone}
      onCategory={setCategory}
      onDescription={setDescription}
      onCapture={handleCapture}
      onClearPhoto={() => {
        setImageFile(null);
        setImagePreview(null);
        setPhotoInputKey((key) => key + 1);
      }}
      onLocate={locate}
      onManualLocation={(lat, lng) => {
        setLocation({ lat, lng });
        setFormTone("ok");
        setFormMessage("Location set from the coordinates you entered.");
      }}
      onSubmit={() => void handleSubmit()}
      onLogout={() => void handleLogout()}
      onHome={() => setView("home")}
    />
  );
}
