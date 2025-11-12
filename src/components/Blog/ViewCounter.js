"use client";
import React, { useEffect, useState } from "react";

const ViewCounter = ({ slug, noCount = false, showCount = true }) => {
  const [views, setViews] = useState(0);

  useEffect(() => {
    const incrementView = async () => {
      try {
        // Call API route to increment view count
        const response = await fetch(`/api/views/${slug}`, {
          method: 'POST',
        });
        
        if (!response.ok) {
          console.error("Error incrementing view count:", response.statusText);
        }
      } catch (error) {
        console.error("An error occurred while incrementing the view count:", error);
      }
    };

    if (!noCount) {
      incrementView();
    }
  }, [slug, noCount]);

  useEffect(() => {
    const getViews = async () => {
      try {
        // Call API route to get view count
        const response = await fetch(`/api/views/${slug}`);
        
        if (response.ok) {
          const data = await response.json();
          setViews(data.views || 0);
        } else {
          console.error("Error fetching view count:", response.statusText);
        }
      } catch (error) {
        console.error("An error occurred while fetching the view count:", error);
      }
    };

    getViews();
  }, [slug]);

  if (showCount) {
    return <div>{views} views</div>;
  } else {
    return null;
  }
};

export default ViewCounter;
