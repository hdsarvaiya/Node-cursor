// src/context/MyContext.js
import React, { createContext, useState } from 'react';

export const MyContext = createContext();

export const MyContextProvider = ({ children }) => {
  const [value, setValue] = useState("initial value");

  return (
    <MyContext.Provider value={{ value, setValue }}>
      {children}
    </MyContext.Provider>
  );
};
