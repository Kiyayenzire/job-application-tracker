import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const authApi = vi.hoisted(() => ({
  loginWithGoogle: vi.fn(),
  registerUser: vi.fn(),
}));

vi.mock("../api", () => authApi);

import { CreateAccountPage } from "./CreateAccountPage";

describe("CreateAccountPage", () => {
  afterEach(() => {
    delete window.google;
    delete window.__JAT_CONFIG__;
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("shows a password rule error for weak passwords", async () => {
    render(<CreateAccountPage onAuthenticated={vi.fn()} />);

    await userEvent.type(screen.getByLabelText("Username"), "demo");
    await userEvent.type(screen.getByLabelText("Password"), "abc123");
    await userEvent.type(screen.getByLabelText("Confirm password"), "abc123");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(screen.getByText(/Password must be at least 7 characters and include uppercase, lowercase, a number, and a special character./i)).toBeInTheDocument();
  });

  it("creates or signs into an account with Google", async () => {
    let googleCallback;
    const renderButton = vi.fn();
    window.google = {
      accounts: {
        id: {
          initialize: vi.fn(({ callback }) => {
            googleCallback = callback;
          }),
          renderButton,
        },
      },
    };
    authApi.loginWithGoogle.mockResolvedValue({
      token: "google-app-token",
      user: { id: 8, username: "google-user" },
    });
    const onAuthenticated = vi.fn();

    render(
      <CreateAccountPage
        googleClientId="test-google-client"
        onAuthenticated={onAuthenticated}
      />,
    );
    await waitFor(() => expect(renderButton).toHaveBeenCalledOnce());

    await act(async () => {
      googleCallback({ credential: "google-id-token" });
    });
    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledOnce());

    expect(authApi.loginWithGoogle).toHaveBeenCalledWith("google-id-token");
    expect(localStorage.getItem("authToken")).toBe("google-app-token");
  });

  it("uses the Google client ID supplied by the frontend runtime config", async () => {
    window.__JAT_CONFIG__ = {
      googleClientId: "runtime-google-client",
    };
    const initialize = vi.fn();
    window.google = {
      accounts: {
        id: {
          initialize,
          renderButton: vi.fn(),
        },
      },
    };

    render(<CreateAccountPage onAuthenticated={vi.fn()} />);

    await waitFor(() =>
      expect(initialize).toHaveBeenCalledWith(
        expect.objectContaining({
          client_id: "runtime-google-client",
        }),
      ),
    );
  });

  it("keeps the Google button enabled and explains missing configuration", async () => {
    render(
      <CreateAccountPage
        googleClientId=""
        onAuthenticated={vi.fn()}
      />,
    );

    const googleButton = screen.getByRole("button", {
      name: /continue with google/i,
    });
    expect(googleButton).toBeEnabled();
    expect(
      screen.queryByText(/sign-in will work once the google client id is configured/i),
    ).not.toBeInTheDocument();
    const username = screen.getByLabelText("Username");
    const password = screen.getByLabelText("Password");
    expect(
      username.compareDocumentPosition(googleButton) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      password.compareDocumentPosition(googleButton) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(authApi.loginWithGoogle).not.toHaveBeenCalled();

    await userEvent.click(googleButton);

    expect(screen.getByRole("alert")).toHaveTextContent(
      /google sign-in is not configured/i,
    );
    expect(authApi.loginWithGoogle).not.toHaveBeenCalled();
  });
});
