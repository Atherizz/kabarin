<script lang="ts">
  let email = $state("");
  let password = $state("");
  let isLoading = $state(false);
  let errorMessage = $state("");

  const API_BASE = import.meta.env.PUBLIC_API_URL ?? "http://localhost:8787";

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    errorMessage = "";
    isLoading = true;

    try {
      const res = await fetch(`${API_BASE}/api/auth/sign-in/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        errorMessage = data.message ?? "Invalid email or password.";
        return;
      }
      window.location.href = "/";
    } catch {
      errorMessage = "Something went wrong. Please try again.";
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="flex min-h-screen items-center justify-center bg-light px-4">
  <div class="w-full max-w-sm rounded-4xl bg-brand/25 p-8">
    <h1 class="text-2xl font-semibold">Sign in to Kabarin</h1>
    <p class="mt-1 text-sm text-dark/75">Enter your email and password to continue.</p>

    <form class="mt-6 space-y-4" onsubmit={handleSubmit}>
      <div>
        <label for="email" class="mb-1 block text-sm font-medium text-dark/75">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          bind:value={email}
          placeholder="you@example.com"
          class="w-full rounded-lg ring-2 ring-brand/25 bg-light px-3 py-2 placeholder-dark/50 outline-none focus:border-brand focus:ring-brand"
        />
      </div>

      <div>
        <label for="password" class="mb-1 block text-sm font-medium text-dark/75">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          bind:value={password}
          placeholder="••••••••"
          class="w-full rounded-lg ring-2 ring-brand/25 bg-light px-3 py-2 placeholder-dark/50 outline-none focus:border-brand focus:ring-brand"
        />
      </div>

      {#if errorMessage}
        <p class="text-sm text-red-400">{errorMessage}</p>
      {/if}

      <button
        type="submit"
        disabled={isLoading}
        class="w-full rounded-lg bg-brand px-4 py-2 font-medium transition hover:bg-brand/75 disabled:cursor-not-allowed disabled:opacity-60 text-light"
      >
        {isLoading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  </div>
</div>
