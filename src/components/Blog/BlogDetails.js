import { format, parseISO } from "date-fns";
import Link from "next/link";
import React from "react";
import { slug } from "github-slugger";
import ViewCounter from "./ViewCounter";

const BlogDetails = ({ blog, slug: blogSlug }) => {
  const primaryTag = blog?.tags?.[0] || "general";
  const publishedDate = blog?.publishedAt ? parseISO(blog.publishedAt) : new Date();
  const readingText = blog?.readingTime?.text || "";

  return (
    <div className="px-2  md:px-10 bg-accent dark:bg-accentDark text-light dark:text-dark py-2 flex items-center justify-around flex-wrap text-lg sm:text-xl font-medium mx-5  md:mx-10 rounded-lg">
      <time className="m-3">
        {format(publishedDate, "LLLL d, yyyy")}
      </time>
      <span className="m-3">
        <ViewCounter slug={blogSlug} />
      </span>
      <div className="m-3">{readingText}</div>
      <Link href={`/categories/${slug(primaryTag)}`} className="m-3">
        #{primaryTag}
      </Link>
    </div>
  );
};

export default BlogDetails;
