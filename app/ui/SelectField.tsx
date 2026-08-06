import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";
import styles from "./primitives.module.css";

export default function SelectField({label,hint,...props}:SelectHTMLAttributes<HTMLSelectElement>&{label:string;hint?:string}) {
  return <label className={styles.field}><span>{label}</span><div><select {...props}/><ChevronDown/></div>{hint?<small>{hint}</small>:null}</label>;
}
