import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Breadcrumb from "../Breadcrumb";

const VALID_STELLAR =
  "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
const CHECKSUM_INVALID_STELLAR = `${VALID_STELLAR.slice(0, -1)}A`;

function renderBreadcrumb(label: string) {
  return render(
    <MemoryRouter>
      <Breadcrumb items={[{ label: "Streams", to: "/app/streams" }, { label }]} />
    </MemoryRouter>,
  );
}

describe("Breadcrumb Stellar address handling", () => {
  it("masks checksum-valid Stellar addresses and keeps the full title", () => {
    renderBreadcrumb(VALID_STELLAR);

    const masked = screen.getByText(
      `${VALID_STELLAR.slice(0, 8)}...${VALID_STELLAR.slice(-4)}`,
    );

    expect(masked).toHaveAttribute("title", VALID_STELLAR);
  });

  it("does not treat checksum-invalid 56-character G strings as Stellar addresses", () => {
    renderBreadcrumb(CHECKSUM_INVALID_STELLAR);

    expect(screen.getByText(CHECKSUM_INVALID_STELLAR)).toBeInTheDocument();
    expect(
      screen.queryByText(
        `${CHECKSUM_INVALID_STELLAR.slice(0, 8)}...${CHECKSUM_INVALID_STELLAR.slice(-4)}`,
      ),
    ).not.toBeInTheDocument();
  });
});
