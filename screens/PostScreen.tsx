import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import {
  collection,
  addDoc,
  serverTimestamp,
  setDoc,
  doc,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import {
  useRoute,
  useNavigation,
  useFocusEffect,
} from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../ThemeContext";
import { lightTheme, darkTheme } from "../themeColors";
import { Picker } from "@react-native-picker/picker";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome } from "@expo/vector-icons";

const INTEREST_OPTIONS = [
  "Poetry",
  "Tennis",
  "Coding",
  "Volunteering",
  "Live Music",
  "Book Clubs",
  "Photography",
  "Dancing",
  "Spirituality",
  "Outdoor Events",
  "Art",
  "Sports",
  "Games",
  "Electronics",
  "Automotive",
  "Garden",
  "Academics",
  "Medical",
  "Beauty",
  "Pet",
  "Food",
  "Clothes",
];

export default function PostScreen() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState(new Date());
  const [fee, setFee] = useState("");
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const editPost = route.params?.editPost || null;
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const currentTheme = isDark ? darkTheme : lightTheme;
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editPost) {
      setTitle(editPost.title);
      setDescription(editPost.description);
      setCategory(editPost.category);
      setLocation(editPost.location);
      setFee(editPost.fee?.toString() || "");
      setDate(new Date(editPost.date));
    }
  }, [editPost]);

  useFocusEffect(
    useCallback(() => {
      if (!editPost) {
        setTitle("");
        setDescription("");
        setCategory("");
        setLocation("");
        setDate(new Date());
        setFee("");
      }
    }, [editPost])
  );

  const handlePost = async () => {
    if (!title || !description || !category || !location || !date) {
      Alert.alert("Please fill out all required fields");
      return;
    }

    try {
      setLoading(true); // start loader
      const userId = auth.currentUser?.uid;

      const postData = {
        title,
        description,
        category,
        location,
        date: date.toISOString(),
        fee: parseFloat(fee) || 0,
        createdBy: userId || "anonymous",
      };

      if (editPost) {
        await setDoc(
          doc(db, "posts", editPost.id),
          {
            ...postData,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        Alert.alert("Post updated!", "Your changes have been saved.");
      } else {
        await addDoc(collection(db, "posts"), {
          ...postData,
          createdAt: serverTimestamp(),
        });
        Alert.alert("Post created!", "Your event has been added.");
      }

      navigation.goBack();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false); // stop loader
    }
  };

  const openDatePicker = () => {
    DateTimePickerAndroid.open({
      value: date,
      mode: "date",
      is24Hour: true,
      onChange: (_, selectedDate) => {
        if (selectedDate) {
          const updatedDate = new Date(selectedDate);
          openTimePicker(updatedDate);
        }
      },
    });
  };

  const openTimePicker = (dateBase: Date) => {
    DateTimePickerAndroid.open({
      value: dateBase,
      mode: "time",
      is24Hour: true,
      onChange: (_, selectedTime) => {
        if (selectedTime) {
          const combined = new Date(
            dateBase.getFullYear(),
            dateBase.getMonth(),
            dateBase.getDate(),
            selectedTime.getHours(),
            selectedTime.getMinutes()
          );
          setDate(combined);
        }
      },
    });
  };

  return (
    <LinearGradient
      colors={["#E0F7FA", "#F5FDFD", "#ffffff"]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={[styles.screen]}>
        <Text style={[styles.title, { color: "#00796B" }]}>
          {" "}
          {editPost ? "Edit Post" : "Create a New Post"}{" "}
        </Text>

        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={[styles.card, { backgroundColor: "#fff" }]}>
            <View>
              <TextInput
                placeholder="Event title"
                value={title}
                onChangeText={setTitle}
                style={[styles.input, { color: currentTheme.textPrimary }]}
                placeholderTextColor={currentTheme.textSecondary}
              />
              <TextInput
                placeholder="Description"
                value={description}
                onChangeText={setDescription}
                style={[
                  styles.input,
                  { height: 80, color: currentTheme.textPrimary },
                ]}
                multiline
                placeholderTextColor={currentTheme.textSecondary}
              />
              <TextInput
                placeholder="Location"
                value={location}
                onChangeText={setLocation}
                style={[styles.input, { color: currentTheme.textPrimary }]}
                placeholderTextColor={currentTheme.textSecondary}
              />
              <TextInput
                placeholder="Fee (leave blank for free)"
                value={fee}
                onChangeText={setFee}
                keyboardType="numeric"
                style={[styles.input, { color: currentTheme.textPrimary }]}
                placeholderTextColor={currentTheme.textSecondary}
              />
              <Text style={[styles.label, { color: currentTheme.textPrimary }]}>
                Category
              </Text>
              <View
                style={[
                  styles.pickerContainer,
                  { borderColor: currentTheme.inputBorder },
                ]}
              >
                <Picker
                  selectedValue={category}
                  onValueChange={(itemValue) => setCategory(itemValue)}
                  style={[styles.picker, { color: currentTheme.textPrimary }]}
                  dropdownIconColor={currentTheme.textPrimary}
                >
                  <Picker.Item label="Select a category" value="" />
                  {INTEREST_OPTIONS.map((option) => (
                    <Picker.Item key={option} label={option} value={option} />
                  ))}
                </Picker>
              </View>
              <Text style={[styles.label, { color: currentTheme.textPrimary }]}>
                Date & Time
              </Text>
              <TouchableOpacity onPress={openDatePicker} style={styles.input}>
                <Text style={{ color: currentTheme.textPrimary }}>
                  {date.toLocaleString()}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handlePost}
                disabled={loading}
                style={[
                  styles.postButton,
                  {
                    backgroundColor: currentTheme.primary,
                    opacity: loading ? 0.6 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.postButtonText,
                    { color: currentTheme.buttonText },
                  ]}
                >
                  {" "}
                  {loading ? "Posting..." : editPost ? "Update" : "Post"}{" "}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  container: {
    flex: 1,
    paddingHorizontal: 10,
  },
  card: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 10,
    width: "100%",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: "#f9f9f9",
  },
  label: {
    fontWeight: "600",
    // marginTop: 10,
    marginBottom: 5,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    width: "100%",
    borderRadius: 10,
    marginBottom: 12,
    backgroundColor: "#f9f9f9",
  },
  picker: {
    height: Platform.OS === "ios" ? 100 : 53,
    width: "100%",
    backgroundColor: "transparent",
  },
  postButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  postButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
