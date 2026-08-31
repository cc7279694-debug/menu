import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CookingPhotoPicker, type CookingPhotoDraft } from "@/features/cooking-history/components/cooking-photo-picker";

describe("CookingPhotoPicker", () => {
  beforeEach(() => {
    vi.spyOn(URL, "createObjectURL").mockImplementation((file) => `blob:${(file as File).name}`);
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
  });

  it("previews valid photos, supports removal, and enforces the three-photo limit", () => {
    const onChange = vi.fn();
    const { unmount } = render(<CookingPhotoPicker onChange={onChange} photos={[]} />);
    const input = screen.getByLabelText("选择成品照片") as HTMLInputElement;
    const file = (name: string) => new File([new Uint8Array([1])], name, { type: "image/jpeg" });

    fireEvent.change(input, { target: { files: [file("a.jpg"), file("b.jpg")] } });
    const next = onChange.mock.calls[0]?.[0] as CookingPhotoDraft[];
    expect(screen.getByRole("heading", { name: "成品照片（可选）" })).toBeInTheDocument();
    expect(next).toHaveLength(2);
    expect(next[0].previewUrl).toBe("blob:a.jpg");
    expect(screen.getByRole("button", { name: "添加照片" })).toBeInTheDocument();

    render(<CookingPhotoPicker onChange={onChange} photos={next} />);
    expect(screen.getByRole("img", { name: "成品照片预览 1" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "移除成品照片 1" }));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:a.jpg");
    unmount();
  });

  it("shows a clear error when more than three photos are selected", () => {
    const onChange = vi.fn();
    render(<CookingPhotoPicker onChange={onChange} photos={[]} />);
    const input = screen.getByLabelText("选择成品照片");
    const file = (name: string) => new File([new Uint8Array([1])], name, { type: "image/jpeg" });
    fireEvent.change(input, { target: { files: [file("a.jpg"), file("b.jpg"), file("c.jpg"), file("d.jpg")] } });
    expect(screen.getByRole("alert")).toHaveTextContent("每次最多上传 3 张成品照片");
    expect(onChange.mock.calls[0]?.[0]).toHaveLength(3);
  });
});
