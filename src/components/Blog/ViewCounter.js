"use client";
import React, { useEffect, useState } from "react";

const ViewCounter = ({ slug, noCount = false, showCount = true }) => {
  const [views, setViews] = useState(0);

  useEffect(() => {
    const updateViews = async () => {
      try {
        if (!noCount) {
          // Increment and get updated count in one request
          const response = await fetch(`/api/views/${slug}`, {
            method: 'POST',
          });
          if (response.ok) {
            const data = await response.json();
            setViews(data.views || 0);
          } else {
            console.error("Error incrementing view count:", response.statusText);
          }
        } else {
          // Read-only: just fetch current count
          const response = await fetch(`/api/views/${slug}`);
          if (response.ok) {
            const data = await response.json();
            setViews(data.views || 0);
          } else {
            console.error("Error fetching view count:", response.statusText);
          }
        }
      } catch (error) {
        console.error("An error occurred while updating the view count:", error);
      }
    };

    updateViews();
  }, [slug, noCount]);

  if (showCount) {
    return <div>{views} views</div>;
  } else {
    return null;
  }
};

export default ViewCounter;
