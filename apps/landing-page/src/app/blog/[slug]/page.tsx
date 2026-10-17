import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogPostTemplate } from "@/components/marketing/blog-post";
import { PageSchema } from "@/components/marketing/structured-data";
import { blogPostByPath, blogPosts } from "@/lib/blog";
import { pageMetadata } from "@/lib/site";

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
  const base = pageMetadata(post.path, `${post.title} | Blog Okado`, post.description);
  return {
    ...base,
    openGraph: {
      ...base.openGraph,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author],
    },
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
        article
        articleType="BlogPosting"
        datePublished={post.publishedAt}
        dateModified={post.updatedAt}
      />
      <BlogPostTemplate post={post} />
    </>
  );
}

