import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const authApi = vi.hoisted(() => ({
  loginUser: vi.fn(),
  loginWithGoogle: vi.fn(),
}));

vi.mock("../api", () => authApi);

import { LoginPage } from "./LoginPage";

describe("LoginPage Google sign-in", () => {
  afterEach(() => {
    delete window.google;
    localStorage.clear();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("exchanges Google's credential for an app token and authenticates the user", async () => {
    let googleCallback;
    const renderButton = vi.fn((container) => {
      const button = document.createElement("button");
      button.textContent = "Continue with Google";
      container.append(button);
    });
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
      token: "app-token",
      user: { id: 5, username: "google-user" },
    });
    const onAuthenticated = vi.fn();

    render(
      <LoginPage
        googleClientId="test-google-client"
        onAuthenticated={onAuthenticated}
      />,
    );
    await waitFor(() => expect(renderButton).toHaveBeenCalledOnce());
    expect(
      document.querySelector(".auth-divider"),
    ).toHaveTextContent(/or continue with google/i);

    await act(async () => {
      googleCallback({ credential: "google-id-token" });
    });

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledOnce());
    expect(authApi.loginWithGoogle).toHaveBeenCalledWith("google-id-token");
    expect(localStorage.getItem("authToken")).toBe("app-token");
    expect(onAuthenticated).toHaveBeenCalledWith({
      id: 5,
      username: "google-user",
    });
  });

  it("keeps the Google button enabled and explains missing configuration", async () => {
    render(
      <LoginPage googleClientId="" onAuthenticated={vi.fn()} />,
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
