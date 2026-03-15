(function () {
  const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
  const state = {
    supported: false,
    ready: false,
    reason: "",
  };

  let registrationPromise = null;

  function isOfflineCapableOrigin() {
    return Boolean(window.isSecureContext) || LOCAL_HOSTS.has(window.location.hostname);
  }

  function getStatus() {
    return { ...state };
  }

  async function registerServiceWorker() {
    if (registrationPromise) {
      return registrationPromise;
    }

    registrationPromise = navigator.serviceWorker
      .register("./sw.js")
      .then(async (registration) => {
        state.supported = true;
        await navigator.serviceWorker.ready;
        state.ready = true;
        return registration;
      })
      .catch((error) => {
        state.supported = false;
        state.ready = false;
        state.reason = error.message || "Could not register the offline worker.";
        throw error;
      });

    return registrationPromise;
  }

  async function prepare(additionalUrls = []) {
    if (!("serviceWorker" in navigator)) {
      return {
        ok: false,
        reason: "This browser does not support service workers.",
      };
    }

    if (!isOfflineCapableOrigin()) {
      return {
        ok: false,
        reason: "Offline install needs HTTPS or localhost. On your home Wi-Fi, keep the tab open unless the app is hosted on HTTPS.",
      };
    }

    const registration = await registerServiceWorker();
    const worker = registration.active || registration.waiting || registration.installing;
    worker?.postMessage({
      type: "warm-cache",
      additionalUrls,
    });

    return {
      ok: true,
      reason: "Preparing the offline cache.",
    };
  }

  if (!("serviceWorker" in navigator)) {
    state.reason = "This browser does not support service workers.";
  } else if (!isOfflineCapableOrigin()) {
    state.reason = "Offline install needs HTTPS or localhost.";
  } else {
    registerServiceWorker()
      .then(() => prepare([]))
      .catch((error) => {
        console.error("Offline registration failed", error);
      });
  }

  window.mossOffline = {
    getStatus,
    prepare,
  };
})();
