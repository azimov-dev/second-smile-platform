export function getErrorMessage(err, t) {
  if (err.code && t(`errors.${err.code}`) !== `errors.${err.code}`) {
    return t(`errors.${err.code}`);
  }
  if (err.message?.includes("already exists")) {
    return t("errors.userExists");
  }
  if (err.message) return err.message;
  return t("errors.unknown");
}
