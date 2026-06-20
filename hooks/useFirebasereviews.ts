import { Review } from "@/interfaces/exportReview";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../config/firebaseConfig";

export function useFirebase(){

    const coleccion = collection(db, "reviews");
    const createReview = async (review:Review) => {
        try 
        {
            const docRef = await addDoc(coleccion, {
                review
            });
            console.log("EXITOOOOOOOOOOO")
        } 
        
        catch (error) 
        
        {
            console.log(error)
        }
    }

    return (createReview);

}