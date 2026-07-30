export const sidebarVariants = {
  expanded: {
    width: 256, // w-64
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  },
  collapsed: {
    width: 80, // w-20
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  },
  closedMobile: {
    x: '-100%',
    width: 256,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  },
}

export const navContainerVariants = {
  visible: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05,
    },
  },
  hidden: {
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
}

export const navItemVariants = {
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  hidden: {
    opacity: 0,
    x: -10,
    transition: { duration: 0.15, ease: 'easeIn' },
  },
}

export const labelVariants = {
  expanded: {
    opacity: 1,
    x: 0,
    display: 'block',
    transition: { duration: 0.2, delay: 0.08 },
  },
  collapsed: {
    opacity: 0,
    x: -8,
    transitionEnd: { display: 'none' },
    transition: { duration: 0.15 },
  },
}

export const dropdownVariants = {
  open: {
    height: 'auto',
    opacity: 1,
    transition: {
      height: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
      opacity: { duration: 0.2, delay: 0.05 },
    },
  },
  closed: {
    height: 0,
    opacity: 0,
    transition: {
      height: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
      opacity: { duration: 0.15 },
    },
  },
}
