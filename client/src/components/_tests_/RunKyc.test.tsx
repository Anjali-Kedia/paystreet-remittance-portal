import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RunKyc from "../../components/RunKyc";

jest.mock("../../lib/api", () => ({
  api: {
    post: jest.fn().mockResolvedValue({ data: { status: "APPROVED" } }),
  },
}));

describe("RunKyc", () => {
  it("sends payload when all fields filled", async () => {
    const { api } = await import("../../lib/api");

    render(<RunKyc />);

    fireEvent.change(screen.getByLabelText(/Full name/i), {
      target: { value: "Alice T" },
    });
    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "a@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/Country/i), {
      target: { value: "IN" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Run KYC/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/kyc/check", {
        fullName: "Alice T",
        email: "a@test.com",
        country: "IN",
      });
    });
  });

  it("blocks submit if a field is empty", async () => {
    const { api } = await import("../../lib/api");

    render(<RunKyc />);

    fireEvent.change(screen.getByLabelText(/Full name/i), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "a@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/Country/i), {
      target: { value: "IN" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Run KYC/i }));

    await waitFor(() => {
      expect(api.post).not.toHaveBeenCalled();
    });
  });
});
