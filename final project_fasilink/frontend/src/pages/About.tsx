import React from 'react';
import './About.css';

const About: React.FC = () => {
  return (
    <div className="owner-container">
      <div className="owner-header">
        <h1>About FasilLink</h1>
      </div>

      <div className="post-form-card about-post-card">
        <p className="about-paragraph">
          FasilLink is a local marketplace platform for Gondar where people can buy, sell, and rent items in three main
          categories: Properties, Vehicles, and Event Materials.
        </p>

        <h3 className="about-heading">What you can do</h3>
        <ul className="about-list">
          <li>Browse listings and filter by category and price.</li>
          <li>Chat directly with item owners to ask questions and negotiate.</li>
          <li>Owners can post items with 2–3 images and manage their listings.</li>
          <li>See announcements and account alerts from the notification bell.</li>
        </ul>

        <h3 className="about-heading">Our goal</h3>
        <p>
          Our goal is to make local buying and renting faster, safer, and more organized so customers can find what they
          need quickly and owners can reach real buyers.
        </p>

        <h3 className="about-heading">Support</h3>
        <p className="about-paragraph about-footer">
          If you need help, use the Messages page to contact owners or check the announcements for platform updates.
        </p>
      </div>
    </div>
  );
};

export default About;
