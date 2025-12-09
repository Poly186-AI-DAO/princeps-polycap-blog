"use client";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { GithubIcon, LinkedinIcon, TwitterIcon, YouTubeIcon, PeerlistIcon, InstagramIcon, TikTokIcon, MediumIcon } from "../Icons";
import siteMetadata from "@/src/utils/siteMetaData";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          source: 'website-footer',
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSubmitStatus({ type: 'success', message: result.message });
        reset();
      } else {
        setSubmitStatus({ 
          type: 'error', 
          message: result.error || 'Something went wrong. Please try again.' 
        });
      }
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      setSubmitStatus({ 
        type: 'error', 
        message: 'Failed to subscribe. Check your connection and try again.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="mt-16 rounded-2xl bg-dark dark:bg-accentDark/90 m-2 sm:m-10 flex flex-col items-center text-light dark:text-dark">
      <h3 className="mt-16 font-medium dark:font-bold text-center text-2xl sm:text-3xl lg:text-4xl px-4">
        Dispatches from the Poly186 build log
      </h3>
      <p className="mt-5 px-4 text-center w-full sm:w-3/5 font-light dark:font-medium text-sm sm:text-base">
        Field notes on Poly, SESAP, Automating Basic Needs, and the Terraforming
        Sahara moonshot told candidly by Princeps Polycap as the work unfolds.
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-6 w-full sm:w-fit sm:min-w-[384px] px-4 sm:px-0"
      >
        <div className="flex items-stretch bg-light dark:bg-dark p-1 sm:p-2 rounded">
          <input
            type="email"
            placeholder="Enter your email"
            {...register("email", { 
              required: "Email is required", 
              maxLength: { value: 80, message: "Email is too long" },
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "Invalid email address"
              }
            })}
            className="w-full bg-transparent pl-2 sm:pl-0 text-dark dark:text-light focus:border-dark dark:focus:border-light focus:ring-0 border-0 border-b mr-2 pb-1"
            disabled={isSubmitting}
          />
          <input
            type="submit"
            value={isSubmitting ? "..." : "Subscribe"}
            disabled={isSubmitting}
            className="bg-dark text-light dark:text-dark dark:bg-light cursor-pointer font-medium rounded px-3 sm:px-5 py-1 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          />
        </div>
        {submitStatus && (
          <div className={`mt-3 text-center text-sm ${
            submitStatus.type === 'success' 
              ? 'text-green-300 dark:text-green-400' 
              : 'text-red-300 dark:text-red-400'
          }`}>
            {submitStatus.message}
          </div>
        )}
      </form>
      <div className="flex items-center mt-8">
        <a
          href={siteMetadata.linkedin}
          className="inline-block w-6 h-6 mr-4 animate-breathe"
          aria-label="Reach out to me via LinkedIn"
          target="_blank"
          rel="noopener noreferrer"
        >
          <LinkedinIcon className="hover:scale-125 transition-all ease duration-200" />
        </a>
        <a
          href={siteMetadata.github}
          className="inline-block w-6 h-6 mr-4 fill-light animate-breathe"
          aria-label="Check my profile on Github"
          target="_blank"
          rel="noopener noreferrer"
        >
          <GithubIcon className="fill-light dark:fill-dark  hover:scale-125 transition-all ease duration-200" />
        </a>
        <a
          href={siteMetadata.twitter}
          className="inline-block w-6 h-6 mr-4 animate-breathe"
          aria-label="Reach out to me via Twitter"
          target="_blank"
          rel="noopener noreferrer"
        >
          <TwitterIcon className="hover:scale-125 transition-all ease duration-200" />
        </a>
        <a
          href={siteMetadata.youtube}
          className="inline-block w-6 h-6 mr-4 animate-breathe"
          aria-label="Check my YouTube channel"
          target="_blank"
          rel="noopener noreferrer"
        >
          <YouTubeIcon className="hover:scale-125 transition-all ease duration-200" />
        </a>
        <a
          href={siteMetadata.peerlist}
          className="inline-block w-6 h-6 mr-4 animate-breathe"
          aria-label="Check my profile on Peerlist"
          target="_blank"
          rel="noopener noreferrer"
        >
          <PeerlistIcon className="hover:scale-125 transition-all ease duration-200" />
        </a>
        <a
          href={siteMetadata.instagram}
          className="inline-block w-6 h-6 mr-4 animate-breathe"
          aria-label="Follow me on Instagram"
          target="_blank"
          rel="noopener noreferrer"
        >
          <InstagramIcon className="hover:scale-125 transition-all ease duration-200" />
        </a>
        <a
          href={siteMetadata.tiktok}
          className="inline-block w-6 h-6 mr-4 animate-breathe"
          aria-label="Follow me on TikTok"
          target="_blank"
          rel="noopener noreferrer"
        >
          <TikTokIcon className="hover:scale-125 transition-all ease duration-200" />
        </a>
        <a
          href={siteMetadata.medium}
          className="inline-block w-6 h-6 mr-4 animate-breathe"
          aria-label="Read my articles on Medium"
          target="_blank"
          rel="noopener noreferrer"
        >
          <MediumIcon className="hover:scale-125 transition-all ease duration-200" />
        </a>
      </div>

      <div className="w-full mt-16 md:mt-24 relative font-medium border-t border-solid border-light py-6 px-8 flex flex-col md:flex-row items-center justify-between">
        <span className="text-center">
          &copy;{currentYear} Princeps Polycap. All rights reserved.
        </span>
        <div className="text-center">
          Documented with &hearts; by{" "}
          <a href={siteMetadata.siteUrl} className="hover:text-accent dark:hover:text-accentDark transition-colors duration-300" target="_blank" rel="noopener noreferrer">
            Princeps Polycap
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
