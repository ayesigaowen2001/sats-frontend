interface ResourceFeedbackTitleDetailProps {
  title: string;
  detail: string;
}

interface ResourceFeedbackStateProps {
  state: "loading" | "empty";
  resourceName: string;
}

type ResourceFeedbackProps =
  | ResourceFeedbackTitleDetailProps
  | ResourceFeedbackStateProps;

function isStateProps(
  props: ResourceFeedbackProps,
): props is ResourceFeedbackStateProps {
  return "state" in props;
}

export function ResourceFeedback(props: ResourceFeedbackProps) {
  const title = isStateProps(props)
    ? props.state === "loading"
      ? `Loading ${props.resourceName}`
      : `No ${props.resourceName} found`
    : props.title;

  const detail = isStateProps(props)
    ? props.state === "loading"
      ? `Fetching ${props.resourceName} for this view.`
      : `Create or import ${props.resourceName} to populate this section.`
    : props.detail;

  return (
    <main className="flex w-full flex-1 px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6 xl:px-7">
      <section className="w-full rounded-[2rem] border border-white/10 bg-black/20 p-8">
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--color-mist)]">
          {detail}
        </p>
      </section>
    </main>
  );
}
