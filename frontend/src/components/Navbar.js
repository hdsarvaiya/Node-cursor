import React from 'react';
import { Link } from 'react-router-dom';
import { useContext } from 'react';
import { MyContext } from '../context/MyContext'; // Import the context



const Navbar = () => {
    const { value, setValue } = useContext(MyContext); // Access the context
    return (
        <>
      <p>Value from context: {value}</p>
      <button onClick={() => setValue('New Value')}>Change Value</button>
    
    <nav style={styles.navbar}>
      <ul style={styles.navList}>x
        <li style={styles.navItem}>
          <Link to="/" style={styles.navLink}>Home</Link>
        </li>
        <li style={styles.navItem}>
          <Link to="/node-management" style={styles.navLink}>Node Management</Link>
        </li>
      </ul>
    </nav>
    </>
  );
};

const styles = {
  navbar: {
    backgroundColor: '#333',
    padding: '10px 20px',
  },
  navList: {
    listStyle: 'none',
    display: 'flex',
    justifyContent: 'space-around',
    margin: 0,
    padding: 0,
  },
  navItem: {
    margin: '0 10px',
  },
  navLink: {
    color: '#fff',
    textDecoration: 'none',
    fontSize: '18px',
  },
};

export default Navbar;