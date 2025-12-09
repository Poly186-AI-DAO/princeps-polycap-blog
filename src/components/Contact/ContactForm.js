"use client";
import React, { useState } from "react";
import { useForm } from "react-hook-form";

export default function ContactForm() {
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
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone || '',
          projectDetails: data.projectDetails,
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
      console.error('Form submission error:', error);
      setSubmitStatus({ 
        type: 'error', 
        message: 'Failed to send. Check your connection and try again.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-12 text-base xs:text-lg sm:text-xl font-medium leading-relaxed font-in"
      >
        Hey Princeps, my name is{" "}
        <input
          type="text"
          placeholder="your name"
          {...register("name", { 
            required: "Name is required", 
            maxLength: { value: 80, message: "Name is too long" },
            minLength: { value: 2, message: "Name is too short" }
          })}
          className="outline-none border-0 p-0 mx-2 focus:ring-0 placeholder:text-center placeholder:text-lg border-b border-gray focus:border-gray bg-transparent text-dark dark:text-light"
        />
        {errors.name && <span className="block text-red-600 dark:text-red-400 text-sm mt-1">{errors.name.message}</span>}
        and I want to explore how we can collaborate on Poly, SESAP, or Automating Basic Needs. You can email me at
        <input 
          type="email" 
          placeholder="your@email" 
          {...register("email", { 
            required: "Email is required",
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: "Invalid email address"
            }
          })}  
          className="outline-none border-0 p-0 mx-2 focus:ring-0 placeholder:text-center placeholder:text-lg border-b border-gray focus:border-gray bg-transparent text-dark dark:text-light"
        />
        {errors.email && <span className="block text-red-600 dark:text-red-400 text-sm mt-1">{errors.email.message}</span>}
        or reach out to me on
        <input
          type="tel"
          placeholder="your phone"
          {...register("phone", {
            pattern: {
              value: /^[+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/,
              message: "Invalid phone number"
            }
          })}
          className="outline-none border-0 p-0 mx-2 focus:ring-0 placeholder:text-center placeholder:text-lg border-b border-gray focus:border-gray bg-transparent text-dark dark:text-light"
        />
        {errors.phone && <span className="block text-red-600 dark:text-red-400 text-sm mt-1">{errors.phone.message}</span>}
        Here are some details about my project, mission, or bottleneck: <br />
        <textarea 
          {...register("projectDetails", { 
            required: "Please tell me about your project",
            minLength: { value: 10, message: "Please provide more details (at least 10 characters)" },
            maxLength: { value: 1000, message: "Message is too long (max 1000 characters)" }
          })} 
          placeholder="My project is about..."
          rows={3}
          className="w-full outline-none border-0 p-0 mx-0 focus:ring-0 placeholder:text-lg border-b border-gray focus:border-gray bg-transparent text-dark dark:text-light" 
        />
        {errors.projectDetails && <span className="block text-red-600 dark:text-red-400 text-sm mt-1">{errors.projectDetails.message}</span>}

        {submitStatus && (
          <div className={`mt-4 p-3 rounded ${
            submitStatus.type === 'success' 
              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' 
              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
          }`}>
            {submitStatus.message}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <input 
            type="submit" 
            value={isSubmitting ? "Sending..." : "Send Transmission"} 
            disabled={isSubmitting}
            className="font-medium inline-block capitalize text-lg sm:text-xl py-2 sm:py-3 px-6 sm:px-8 border-2 border-solid border-dark dark:border-light rounded cursor-pointer hover:bg-dark hover:text-light dark:hover:bg-light dark:hover:text-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
          />
          <a
            href="https://cal.com/princeps"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium inline-block text-center capitalize text-lg sm:text-xl py-2 sm:py-3 px-6 sm:px-8 bg-dark text-light dark:bg-light dark:text-dark rounded cursor-pointer hover:bg-dark/90 dark:hover:bg-light/90 transition-colors"
          >
            Schedule a Call
          </a>
        </div>
      </form>
    </>
  );
}
