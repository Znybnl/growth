import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogPostTemplate } from "@/components/marketing/blog-post";
import { PageSchema } from "@/components/marketing/structured-data";
import { blogPostByPath, blogPosts } from "@/lib/blog";
import { pageMetadata, SITE_URL } from "@/lib/site";

export const dynamicParams = false;

type Props = { params: Promise<{ slug: string }> };

function postFromSlug(slug: string) {
  return blogPostByPath(`/blog/${slug}`);
}
export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.path.replace("/blog/", "") }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = postFromSlug((await params).slug);
  if (!post) notFound();
  const base = pageMetadata(post.path, post.title, post.description);
  const image = post.image ? `${SITE_URL}${post.image}` : undefined;
  return {
    ...base,
    openGraph: {
      ...base.openGraph,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author],
      ...(image
        ? {
            images: [{ url: image, alt: post.imageAlt ?? post.title }],
          }
        : {}),
    },
    ...(image
      ? {
          twitter: {
            ...base.twitter,
            images: [image],
          },
        }
      : {}),
  };
}

export default async function BlogPostPage({ params }: Props) {
  const post = postFromSlug((await params).slug);
  if (!post) notFound();

  return (
    <>
      <PageSchema
        path={post.path}
        name={post.title}
        description={post.description}
        author={post.author}
        image={`${SITE_URL}${post.image ?? "/og-image.png"}`}
        article
        articleType="BlogPosting"
        datePublished={post.publishedAt}
        dateModified={post.updatedAt}
      />
      <BlogPostTemplate post={post} />
    </>
  );
}

