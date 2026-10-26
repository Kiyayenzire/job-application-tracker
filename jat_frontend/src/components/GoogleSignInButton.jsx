import React from "react";

const GOOGLE_IDENTITY_SCRIPT =
  "https://accounts.google.com/gsi/client";
let googleIdentityScriptPromise;

function loadGoogleIdentity() {
  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google);
  }

  if (!googleIdentityScriptPromise) {
    googleIdentityScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = GOOGLE_IDENTITY_SCRIPT;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.google?.accounts?.id) {
          resolve(window.google);
        } else {
          googleIdentityScriptPromise = undefined;
          reject(new Error("Google sign-in could not be initialized."));
        }
      };
      script.onerror = () => {
        googleIdentityScriptPromise = undefined;
        reject(new Error("Google sign-in could not be loaded. Please try again."));
      };
      document.head.appendChild(script);
    });
  }

  return googleIdentityScriptPromise;
}

export function GoogleSignInButton({
  clientId =
    window.__JAT_CONFIG__?.googleClientId ||
    import.meta.env.VITE_GOOGLE_CLIENT_ID,
  onCredential,
}) {
  const buttonRef = React.useRef(null);
  const onCredentialRef = React.useRef(onCredential);
  const [error, setError] = React.useState("");
  onCredentialRef.current = onCredential;

  React.useEffect(() => {
    if (!clientId || !buttonRef.current) return undefined;

    let active = true;
    loadGoogleIdentity()
      .then((google) => {
        if (!active || !buttonRef.current) return;
        google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (!active) return;
            if (!response.credential) {
              setError("Google did not return a sign-in credential.");
              return;
            }
            onCredentialRef.current(response.credential);
          },
        });
        google.accounts.id.renderButton(buttonRef.current, {
          text: "continue_with",
          size: "large",
          shape: "rectangular",
          width: Math.min(
            360,
            buttonRef.current.parentElement.clientWidth || 360,
          ),
        });
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      });

    return () => {
      active = false;
      if (buttonRef.current) buttonRef.current.replaceChildren();
    };
  }, [clientId]);

  if (!clientId) {
    return (
      <div className="google-sign-in google-sign-in-unavailable">
        <button
          className="google-sign-in-unavailable-button"
          onClick={() =>
            setError(
              "Google sign-in is not configured. Set VITE_GOOGLE_CLIENT_ID to enable it.",
            )
          }
          type="button"
        >
          <span aria-hidden="true" className="google-sign-in-mark">G</span>
          Continue with Google
        </button>
        {error && <p className="error" role="alert">{error}</p>}
      </div>
    );
  }

  return (
    <div className="google-sign-in">
      <div ref={buttonRef} />
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
