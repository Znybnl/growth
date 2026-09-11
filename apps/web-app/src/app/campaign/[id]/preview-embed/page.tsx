import CampaignPage from "../page";

type PreviewEmbedPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    previewToken?: string;
  }>;
};

/**
 * Dedicated same-origin entry point for the merchant desktop preview iframe.
 * Keeping the public experience in the existing page preserves one rendering path.
 */
export default async function PreviewEmbedPage({ params, searchParams }: PreviewEmbedPageProps) {
  const query = await searchParams;

  return CampaignPage({
    params,
    searchParams: Promise.resolve({
      preview: "1",
      previewToken: query.previewToken,
    }),
  });
}
