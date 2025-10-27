
'use client';

import React from 'react';
import styles from './CustomAlert.module.css';

interface CustomAlertProps {
  message: string;
  details: string;
  onClose: () => void;
}

const CustomAlert: React.FC<CustomAlertProps> = ({ message, details, onClose }) => {
  return (
    <div className={styles.overlay}>
      <div className={styles.alertBox}>
        <p className={styles.message}>{message}</p>
        <p className={styles.details}>{details}</p>
        <button onClick={onClose} className={styles.closeButton}>
          Cerrar
        </button>
      </div>
    </div>
  );
};

export default CustomAlert;
