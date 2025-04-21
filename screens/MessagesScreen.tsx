import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { collection, query, onSnapshot, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';

type Group = {
    id: string;
    title: string;
    members: string[];
  };

export default function MessagesScreen({ navigation }: any) {
    const [groups, setGroups] = useState<Group[]>([]);

    useEffect(() => {
        const q = query(collection(db, 'groups'));
      
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const userGroups: Group[] = snapshot.docs
            .filter(doc => doc.data().members.includes(auth.currentUser?.uid))
            .map(doc => ({ id: doc.id, ...doc.data() } as Group));
      
          setGroups(userGroups);
        });
      
        return () => unsubscribe();
      }, []);      

  return (
    <View style={styles.container}>
      <FlatList
        data={groups}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item }: any) => (
          <TouchableOpacity
            style={styles.groupItem}
            onPress={() => navigation.navigate('Chat', { groupId: item.id })}
          >
            <Text style={styles.groupText}>{item.title}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  groupItem: {
    backgroundColor: '#E0F7FA',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
  },
  groupText: {
    fontSize: 18,
    color: '#00796B',
  },
});