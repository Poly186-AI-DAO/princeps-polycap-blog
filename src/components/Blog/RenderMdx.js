"use client"
import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import MDXContent from './MdxContent'
import Mermaid from './Mermaid'

const mdxComponents = {
  // Add any custom components here
}

const markdownComponents = {
  code({ node, inline, className, children, ...props }) {
    const code = String(children || '').trim();
    const lang = (className || '').replace('language-', '');

    if (!inline && (lang === 'mermaid' || className === 'mermaid')) {
      return <Mermaid chart={code} />;
    }

    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
};

const RenderMdx = ({blog}) => {
  const isDbBlog = blog?.source === 'db';
  const content = blog?.content || '';

  return (
    <div className='col-span-12  lg:col-span-8 font-in prose sm:prose-base md:prose-lg max-w-max
    prose-blockquote:bg-accent/20 
    prose-blockquote:p-2
    prose-blockquote:px-6
    prose-blockquote:border-accent
    prose-blockquote:not-italic
    prose-blockquote:rounded-r-lg

    prose-figure:relative
    prose-figcaption:mt-1
    prose-figcaption:mb-2

    prose-li:marker:text-accent

    dark:prose-invert
    dark:prose-blockquote:border-accentDark
    dark:prose-blockquote:bg-accentDark/20
    dark:prose-li:marker:text-accentDark

    first-letter:text-3xl
    sm:first-letter:text-5xl'>
        {isDbBlog ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSlug]}
            components={markdownComponents}
          >
            {content}
          </ReactMarkdown>
        ) : (
          <MDXContent code={blog.body} components={mdxComponents}/>
        )}
    </div>
  )
}

export default RenderMdx
