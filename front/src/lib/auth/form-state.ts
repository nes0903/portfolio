export interface AdminFormState {
  readonly message: string;
  readonly status: "idle" | "error" | "success";
}

export const initialAdminFormState: AdminFormState = {
  message: "",
  status: "idle",
};
